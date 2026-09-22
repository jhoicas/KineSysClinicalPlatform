package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
	"github.com/kinesys/clinical-platform-backend/internal/middleware"
)

type WithingsHardwareHandler struct {
	accessToken  string
	refreshToken string
	userID       string
	apiBaseURL   string
	clientID         string
	clientSecret     string
	client           *http.Client
	db               *pgxpool.Pool
	patientService   ports.PatientService
	anthropometrySvc ports.AnthropometryService
}

var (
	pocMutex         sync.Mutex
	pocSessionActive bool
	pocRawPayload    map[string]interface{}
	pocExpiresAt     time.Time
)

type withingsMeasure struct {
	Value    float64 `json:"value"`
	Unit     int     `json:"unit"`
	Type     int     `json:"type"`
	Position *int    `json:"position,omitempty"`
}

type withingsMeasureGroup struct {
	Date     int64             `json:"date"`
	Measures []withingsMeasure `json:"measures"`
}

type withingsResponse struct {
	Status int `json:"status"`
	Body   struct {
		MeasureGroups []withingsMeasureGroup `json:"measuregrps"`
	} `json:"body"`
}

type WithingsHardwareReading struct {
	PatientID        string            `json:"patient_id"`
	Source           string            `json:"source"`
	EvaluationDate   string            `json:"evaluation_date"`
	WeightKg         *float64          `json:"weight_kg"`
	HeightCm         *float64          `json:"height_cm"`
	BodyFatPct       *float64          `json:"body_fat_pct"`
	FatMassKg        *float64          `json:"fat_mass_kg,omitempty"`
	MuscleMassKg     *float64          `json:"muscle_mass_kg,omitempty"`
	VisceralFatIndex *float64          `json:"visceral_fat_index"`
	BMR              *float64          `json:"bmr"`
	ProviderMeta     map[string]string `json:"provider_meta,omitempty"`
}

func NewWithingsHardwareHandler(
	accessToken, refreshToken, userID, apiBaseURL, clientID, clientSecret string,
	db *pgxpool.Pool,
	patientService ports.PatientService,
	anthropometrySvc ports.AnthropometryService,
) *WithingsHardwareHandler {
	return &WithingsHardwareHandler{
		accessToken:      accessToken,
		refreshToken:     refreshToken,
		userID:           userID,
		apiBaseURL:       strings.TrimRight(apiBaseURL, "/"),
		clientID:         clientID,
		clientSecret:     clientSecret,
		client:           &http.Client{Timeout: 20 * time.Second},
		db:               db,
		patientService:   patientService,
		anthropometrySvc: anthropometrySvc,
	}
}

func (h *WithingsHardwareHandler) resolveTenantID(ctx context.Context, userIDStr string) uuid.UUID {
	defaultTenant := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	if h.db == nil || userIDStr == "" {
		return defaultTenant
	}

	var tidStr string
	err := h.db.QueryRow(ctx, "SELECT tenant_id::text FROM kinesys.users WHERE id = $1 AND is_active = TRUE", userIDStr).Scan(&tidStr)
	if err != nil {
		err = h.db.QueryRow(ctx, "SELECT tenant_id::text FROM kinesys.profiles WHERE id = $1 AND is_active = TRUE", userIDStr).Scan(&tidStr)
	}

	if tidStr != "" {
		if t, err := uuid.Parse(tidStr); err == nil {
			return t
		}
	}
	return defaultTenant
}

func (h *WithingsHardwareHandler) Sync(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(chi.URLParam(r, "patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	if h.accessToken == "" && h.refreshToken == "" {
		http.Error(w, `{"error": "Báscula no vinculada"}`, http.StatusUnauthorized)
		return
	}

	userIDStr, _ := r.Context().Value(middleware.UserIDKey).(string)
	tenantID := h.resolveTenantID(r.Context(), userIDStr)
	
	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient UUID", http.StatusBadRequest)
		return
	}

	patient, err := h.patientService.GetPatient(r.Context(), patientUUID, tenantID)
	if err != nil {
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	}

	reading, err := h.fetchEvaluation(r.Context(), patient)
	if err != nil {
		// If unauthorized, try to refresh
		if strings.Contains(err.Error(), "HTTP 401") && h.refreshToken != "" {
			if refreshErr := h.refreshAccessToken(r.Context()); refreshErr == nil {
				// Retry fetch after successful refresh
				reading, err = h.fetchEvaluation(r.Context(), patient)
			}
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reading)
}

func (h *WithingsHardwareHandler) refreshAccessToken(ctx context.Context) error {
	form := url.Values{
		"action":        {"requesttoken"},
		"grant_type":    {"refresh_token"},
		"client_id":     {h.clientID},
		"client_secret": {h.clientSecret},
		"refresh_token": {h.refreshToken},
	}
	
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://wbsapi.withings.net/v2/oauth2", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("refresh failed with status %d", res.StatusCode)
	}

	var payload struct {
		Status int `json:"status"`
		Body   struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			UserID       string `json:"userid"`
		} `json:"body"`
	}

	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return err
	}
	if payload.Status != 0 {
		return fmt.Errorf("Withings API status=%d", payload.Status)
	}

	// Update local state (in a real app, save to DB/config)
	h.accessToken = payload.Body.AccessToken
	h.refreshToken = payload.Body.RefreshToken
	h.userID = payload.Body.UserID

	fmt.Printf("[Withings Refresh] Refreshed tokens for UserID=%s\n", h.userID)
	return nil
}

func (h *WithingsHardwareHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		http.Error(w, "Missing code parameter", http.StatusBadRequest)
		return
	}

	form := url.Values{
		"action":        {"requesttoken"},
		"grant_type":    {"authorization_code"},
		"client_id":     {h.clientID},
		"client_secret": {h.clientSecret},
		"code":          {code},
		"redirect_uri":  {"https://clinicalplatform.ludoia.com/api/v1/withings/callback"},
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/v2/oauth2", strings.NewReader(form.Encode()))
	if err != nil {
		http.Error(w, "Error creating request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		http.Error(w, "Error communicating with Withings", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()

	var payload struct {
		Status int `json:"status"`
		Body   struct {
			UserID       string `json:"userid"`
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
		} `json:"body"`
	}

	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid response from Withings", http.StatusBadGateway)
		return
	}

	if payload.Status != 0 {
		http.Error(w, fmt.Sprintf("Withings API returned status %d", payload.Status), http.StatusBadGateway)
		return
	}

	// Store tokens in memory (in production, these should be persisted to DB)
	h.userID = payload.Body.UserID
	h.accessToken = payload.Body.AccessToken
	h.refreshToken = payload.Body.RefreshToken

	// Log tokens for verification
	fmt.Printf("[Withings OAuth] Linked Successfully! UserID: %s, AccessToken: %s, RefreshToken: %s\n", h.userID, h.accessToken, h.refreshToken)

	// HTML Response
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Vinculación Exitosa</title>
			<style>
				body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f7f6; margin: 0; }
				.card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
				h2 { color: #2ecc71; }
				p { color: #555; }
			</style>
		</head>
		<body>
			<div class="card">
				<h2>✅ Báscula Withings vinculada con éxito.</h2>
				<p>Ya puedes cerrar esta ventana y volver a la plataforma.</p>
			</div>
		</body>
		</html>
	`))
}

func (h *WithingsHardwareHandler) fetchEvaluation(ctx context.Context, patient *domain.Patient) (*WithingsHardwareReading, error) {
	form := url.Values{
		"action":    {"getmeas"},
		"meastypes": {"1,4,6,76,88,123,126,127,135,170,226"},
		"category":  {"1"},
		"userid":    {h.userID},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.apiBaseURL+"/measure", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+h.accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Withings request failed: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("Withings HTTP %d", res.StatusCode)
	}

	var payload withingsResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("invalid Withings response: %w", err)
	}
	if payload.Status != 0 {
		return nil, fmt.Errorf("Withings API status=%d", payload.Status)
	}
	if len(payload.Body.MeasureGroups) == 0 {
		return nil, fmt.Errorf("Withings returned no measurements")
	}

	weight, weightAt := latestMeasure(payload.Body.MeasureGroups, 1)
	height, _ := latestMeasure(payload.Body.MeasureGroups, 4)
	fatPct, fatAt := latestMeasure(payload.Body.MeasureGroups, 6)
	
	visceral126, _ := latestMeasure(payload.Body.MeasureGroups, 126)
	visceral127, _ := latestMeasure(payload.Body.MeasureGroups, 127)
	visceral170, _ := latestMeasure(payload.Body.MeasureGroups, 170)
	
	bmr123, _ := latestMeasure(payload.Body.MeasureGroups, 123)
	bmr135, _ := latestMeasure(payload.Body.MeasureGroups, 135)
	bmr226, _ := latestMeasure(payload.Body.MeasureGroups, 226)

	fatMass, _ := latestMeasure(payload.Body.MeasureGroups, 88)
	muscleMass, _ := latestMeasure(payload.Body.MeasureGroups, 76)

	measuredAt := weightAt
	if measuredAt == 0 {
		measuredAt = fatAt
	}
	if measuredAt == 0 {
		measuredAt = payload.Body.MeasureGroups[0].Date
	}

	reading := &WithingsHardwareReading{
		PatientID:        patient.ID.String(),
		Source:           "WITHINGS",
		EvaluationDate:   time.Unix(measuredAt, 0).UTC().Format("2006-01-02"),
		WeightKg:         scaledValue(weight, 1, 3),
		HeightCm:         scaledValue(height, 100, 2),
		BodyFatPct:       scaledValue(fatPct, 1, 2),
		FatMassKg:        scaledValue(fatMass, 1, 3),
		MuscleMassKg:     scaledValue(muscleMass, 1, 3),
		VisceralFatIndex: scaledValue(visceral170, 1, 2),
		BMR:              scaledValue(bmr226, 1, 2),
		ProviderMeta:     map[string]string{"device_model": "Withings Body Scan"},
	}

	if reading.VisceralFatIndex == nil {
		reading.VisceralFatIndex = scaledValue(visceral126, 1, 2)
	}
	if reading.VisceralFatIndex == nil {
		reading.VisceralFatIndex = scaledValue(visceral127, 1, 2)
	}

	if reading.BMR == nil {
		reading.BMR = scaledValue(bmr123, 1, 2)
	}
	if reading.BMR == nil {
		reading.BMR = scaledValue(bmr135, 1, 2)
	}

	if reading.FatMassKg == nil && reading.WeightKg != nil && reading.BodyFatPct != nil {
		fm := *reading.WeightKg * (*reading.BodyFatPct / 100.0)
		reading.FatMassKg = &fm
	}
	if reading.MuscleMassKg == nil && reading.WeightKg != nil && reading.FatMassKg != nil {
		mm := *reading.WeightKg - *reading.FatMassKg
		reading.MuscleMassKg = &mm
	}

	if reading.BMR == nil && reading.WeightKg != nil {
		pHeight := 0.0
		if reading.HeightCm != nil {
			pHeight = *reading.HeightCm
		} else if patient.HeightCm != nil {
			pHeight = *patient.HeightCm
		}

		age := 0
		if patient.BirthDate != nil {
			pt, _ := time.Parse("2006-01-02", *patient.BirthDate)
			if !pt.IsZero() {
				age = int(time.Since(pt).Hours() / 24 / 365)
			}
		}
		
		sex := domain.SexMale
		if patient.Gender != nil && *patient.Gender == "female" {
			sex = domain.SexFemale
		}

		if pHeight > 0 && age > 0 {
			bmrRes, err := h.anthropometrySvc.CalculateMifflinStJeor(domain.BmrInputs{
				WeightKg: *reading.WeightKg,
				HeightCm: pHeight,
				AgeYears: age,
				Sex:      sex,
			})
			if err == nil {
				bmrVal := bmrRes.BmrKcal
				reading.BMR = &bmrVal
				reading.ProviderMeta["bmr_source"] = "Calculated (Mifflin-St Jeor)"
			}
		}
	}

	return reading, nil
}

func latestMeasure(groups []withingsMeasureGroup, measureType int) (withingsMeasure, int64) {
	var latest withingsMeasure
	var measuredAt int64
	for _, group := range groups {
		for _, measure := range group.Measures {
			if measure.Type == measureType && group.Date > measuredAt {
				latest = measure
				measuredAt = group.Date
			}
		}
	}
	return latest, measuredAt
}

func scaledValue(measure withingsMeasure, multiplier float64, decimals int) *float64 {
	if measure.Type == 0 {
		return nil
	}
	value := measure.Value * pow10(measure.Unit) * multiplier
	if decimals > 0 {
		factor := pow10(decimals)
		value = float64(int64(value*factor+0.5)) / factor
	}
	return &value
}

func pow10(exponent int) float64 {
	value := 1.0
	if exponent >= 0 {
		for i := 0; i < exponent; i++ {
			value *= 10
		}
		return value
	}
	for i := 0; i > exponent; i-- {
		value /= 10
	}
	return value
}

func (h *WithingsHardwareHandler) StartSession(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(chi.URLParam(r, "patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	userIDStr, _ := r.Context().Value(middleware.UserIDKey).(string)
	tenantID := h.resolveTenantID(r.Context(), userIDStr)
	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient UUID", http.StatusBadRequest)
		return
	}

	// Create a new session
	session := &domain.ActiveWeighInSession{
		TenantID:  tenantID,
		PatientID: patientUUID,
		Status:    "pending",
		ExpiresAt: time.Now().Add(3 * time.Minute),
	}

	log.Printf("[WITHINGS] Sesión PENDING creada para paciente %s. Expirará a las %s", session.PatientID, session.ExpiresAt)

	if err := h.anthropometrySvc.CreateWeighInSession(r.Context(), session); err != nil {
		fmt.Printf("Error detallado al crear sesión: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to start session: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

func (h *WithingsHardwareHandler) CheckSessionStatus(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(chi.URLParam(r, "patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// tenantID is no longer required for checking session status
	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient UUID", http.StatusBadRequest)
		return
	}

	session, err := h.anthropometrySvc.GetPendingWeighInSession(r.Context(), patientUUID)
	if err != nil {
		// No pending session found
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"status":"not_found"}`))
		return
	}

	// If it's expired, update it
	if time.Now().After(session.ExpiresAt) && session.Status == "pending" {
		session.Status = "expired"
		_ = h.anthropometrySvc.UpdateWeighInSession(r.Context(), session)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

func (h *WithingsHardwareHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	// Withings sends a POST with application/x-www-form-urlencoded
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	// Log webhook
	log.Printf("[WITHINGS WEBHOOK] Payload recibido: %v", r.Form)

	pocMutex.Lock()
	if pocSessionActive {
		// Save everything for POC
		pocRawPayload = make(map[string]interface{})
		for k, v := range r.Form {
			if len(v) == 1 {
				pocRawPayload[k] = v[0]
			} else {
				pocRawPayload[k] = v
			}
		}
		pocSessionActive = false
		log.Printf("[WITHINGS POC] ¡Payload de prueba capturado con éxito!")
		pocMutex.Unlock()
		w.WriteHeader(http.StatusOK)
		return
	}
	pocMutex.Unlock()

	// Fetch the latest pending session globally
	session, err := h.anthropometrySvc.GetLatestPendingWeighInSession(context.Background())
	if err != nil || session == nil {
		fmt.Println("[Withings Webhook] No active pending session found. Ignoring.")
		w.WriteHeader(http.StatusOK) // Return 200 so Withings knows we received it
		return
	}

	// Double check expiration just in case
	if time.Now().After(session.ExpiresAt) {
		session.Status = "expired"
		_ = h.anthropometrySvc.UpdateWeighInSession(context.Background(), session)
		w.WriteHeader(http.StatusOK)
		return
	}

	// Get patient to calculate BMR and formatting
	patient, err := h.patientService.GetPatient(context.Background(), session.PatientID, session.TenantID)
	if err != nil {
		fmt.Println("[Withings Webhook] Patient not found for session.")
		w.WriteHeader(http.StatusOK)
		return
	}

	// Fetch actual reading from Withings
	reading, err := h.fetchEvaluation(context.Background(), patient)
	if err != nil {
		// Try refreshing if 401
		if strings.Contains(err.Error(), "HTTP 401") && h.refreshToken != "" {
			if refreshErr := h.refreshAccessToken(context.Background()); refreshErr == nil {
				reading, err = h.fetchEvaluation(context.Background(), patient)
			}
		}
		if err != nil {
			fmt.Printf("[Withings Webhook] Error fetching evaluation: %v\n", err)
			w.WriteHeader(http.StatusOK)
			return
		}
	}

	// Update session
	payload, _ := json.Marshal(reading)
	session.Status = "completed"
	session.MetricsPayload = payload

	if err := h.anthropometrySvc.UpdateWeighInSession(context.Background(), session); err != nil {
		fmt.Printf("[Withings Webhook] Failed to update session: %v\n", err)
	} else {
		fmt.Printf("[Withings Webhook] Session %s marked as completed!\n", session.ID)
	}

	// Registrar la evaluación en kinesys.evaluaciones_antropometricas
	evalHeight := reading.HeightCm
	if evalHeight == nil {
		evalHeight = patient.HeightCm
	}

	// Fallback to 0 if still nil
	hVal := 0.0
	if evalHeight != nil {
		hVal = *evalHeight
	}
	wVal := 0.0
	if reading.WeightKg != nil {
		wVal = *reading.WeightKg
	}

	// Provide BMI if possible
	var bmiVal *float64
	if hVal > 0 && wVal > 0 {
		bmi := wVal / ((hVal / 100) * (hVal / 100))
		bmiVal = &bmi
	}

	eval := &domain.AnthropometricEvaluation{
		ID:                uuid.New(),
		TenantID:          session.TenantID,
		PatientID:         session.PatientID,
		ProfessionalID:    uuid.Nil, // Automatically generated from hardware, no specific professional
		EvaluationDate:    time.Now(),
		WeightKg:          reading.WeightKg,
		HeightCm:          evalHeight,
		BMI:               bmiVal,
		BodyFatPercentage: reading.BodyFatPct,
		MuscleMassKg:      reading.MuscleMassKg,
	}

	if err := h.anthropometrySvc.CreateEvaluation(context.Background(), eval); err != nil {
		fmt.Printf("[Withings Webhook] Failed to save anthropometric evaluation: %v\n", err)
	} else {
		fmt.Printf("[Withings Webhook] Saved anthropometric evaluation for patient %s\n", session.PatientID)
	}

	// Always return 200 OK to Withings to acknowledge receipt
	w.WriteHeader(http.StatusOK)
}

func (h *WithingsHardwareHandler) SubscribeWebhook(w http.ResponseWriter, r *http.Request) {
	if h.accessToken == "" && h.refreshToken == "" {
		http.Error(w, `{"error": "Báscula no vinculada"}`, http.StatusUnauthorized)
		return
	}

	form := url.Values{
		"action":      {"subscribe"},
		"appli":       {"1"},
		"callbackurl": {"https://clinicalplatform.ludoia.com/api/v1/withings/webhook"},
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/notify", strings.NewReader(form.Encode()))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Authorization", "Bearer "+h.accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		http.Error(w, "Error calling Withings", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()

	var payload struct {
		Status int `json:"status"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid Withings response", http.StatusBadGateway)
		return
	}

	// Handle token expiry
	if payload.Status == 401 && h.refreshToken != "" {
		if refreshErr := h.refreshAccessToken(r.Context()); refreshErr == nil {
			req, _ = http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/notify", strings.NewReader(form.Encode()))
			req.Header.Set("Authorization", "Bearer "+h.accessToken)
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			res, err = h.client.Do(req)
			if err == nil {
				defer res.Body.Close()
				json.NewDecoder(res.Body).Decode(&payload)
			}
		}
	}

	if payload.Status != 0 {
		http.Error(w, fmt.Sprintf(`{"error": "Withings returned status %d"}`, payload.Status), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success", "message": "Webhook subscribed"}`))
}


// POC Endpoints

func (h *WithingsHardwareHandler) StartPocSession(w http.ResponseWriter, r *http.Request) {
	pocMutex.Lock()
	defer pocMutex.Unlock()
	pocSessionActive = true
	pocRawPayload = nil
	pocExpiresAt = time.Now().Add(5 * time.Minute)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "poc_started", "message": "Sesion de prueba activa por 5 minutos"}`))
}

func (h *WithingsHardwareHandler) GetPocData(w http.ResponseWriter, r *http.Request) {
	pocMutex.Lock()
	defer pocMutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"active":     pocSessionActive,
		"payload":    pocRawPayload,
		"expires_at": pocExpiresAt,
	})
}
