package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
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
	mu               sync.RWMutex
	accessToken      string
	refreshToken     string
	userID           string
	lastAccessToken  string
	userTokens       map[string]string
	apiBaseURL       string
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
	h := &WithingsHardwareHandler{
		accessToken:      accessToken,
		refreshToken:     refreshToken,
		userID:           userID,
		lastAccessToken:  accessToken,
		userTokens:       map[string]string{},
		apiBaseURL:       strings.TrimRight(apiBaseURL, "/"),
		clientID:         clientID,
		clientSecret:     clientSecret,
		client:           &http.Client{Timeout: 20 * time.Second},
		db:               db,
		patientService:   patientService,
		anthropometrySvc: anthropometrySvc,
	}
	if db != nil {
		go h.initDatabaseAndTokens(context.Background())
	}
	return h
}

func maskToken(t string) string {
	if t == "" {
		return ""
	}
	if len(t) <= 8 {
		return t
	}
	prefixLen := 4
	suffixLen := 4
	if len(t) <= prefixLen+suffixLen {
		return t[:prefixLen] + "..." + t[len(t)-suffixLen:]
	}
	return t[:prefixLen] + "..." + t[len(t)-suffixLen:]
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

func (h *WithingsHardwareHandler) initDatabaseAndTokens(ctx context.Context) {
	if h.db == nil {
		return
	}

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS kinesys.withings_oauth_tokens (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
		patient_id UUID REFERENCES kinesys.pacientes_clinicos(id) ON DELETE SET NULL,
		userid VARCHAR(100) NOT NULL UNIQUE,
		access_token TEXT NOT NULL,
		refresh_token TEXT NOT NULL,
		expires_at TIMESTAMPTZ NOT NULL,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_patient_id ON kinesys.withings_oauth_tokens(patient_id);
	CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_userid ON kinesys.withings_oauth_tokens(userid);
	`
	if _, err := h.db.Exec(ctx, createTableSQL); err != nil {
		log.Printf("[WITHINGS INIT DB ERROR] Error creando tabla withings_oauth_tokens: %v", err)
	}

	rows, err := h.db.Query(ctx, `
		SELECT userid, access_token, refresh_token, expires_at 
		FROM kinesys.withings_oauth_tokens 
		ORDER BY updated_at DESC
	`)
	if err == nil {
		defer rows.Close()
		count := 0
		h.mu.Lock()
		if h.userTokens == nil {
			h.userTokens = make(map[string]string)
		}
		for rows.Next() {
			var uid, aToken, rToken string
			var expAt time.Time
			if err := rows.Scan(&uid, &aToken, &rToken, &expAt); err == nil {
				h.userTokens[uid] = aToken
				if count == 0 {
					h.lastAccessToken = aToken
					h.accessToken = aToken
					h.refreshToken = rToken
					h.userID = uid
				}
				count++
			}
		}
		h.mu.Unlock()
		if count > 0 {
			log.Printf("[WITHINGS INIT] %d tokens de Withings cargados desde BD a memoria", count)
		}
	}
}

func (h *WithingsHardwareHandler) saveUserTokens(ctx context.Context, tenantID, patientID *uuid.UUID, userid, accessToken, refreshToken string, expiresIn int) error {
	if h.db == nil {
		return nil
	}
	defaultTenant := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	tid := defaultTenant
	if tenantID != nil && *tenantID != uuid.Nil {
		tid = *tenantID
	}

	if expiresIn <= 0 {
		expiresIn = 10800 // 3 hours default
	}
	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)

	query := `
		INSERT INTO kinesys.withings_oauth_tokens (
			tenant_id, patient_id, userid, access_token, refresh_token, expires_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (userid) DO UPDATE SET
			tenant_id = EXCLUDED.tenant_id,
			patient_id = COALESCE(EXCLUDED.patient_id, kinesys.withings_oauth_tokens.patient_id),
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			expires_at = EXCLUDED.expires_at,
			updated_at = NOW()
	`
	_, err := h.db.Exec(ctx, query, tid, patientID, userid, accessToken, refreshToken, expiresAt)
	if err != nil {
		log.Printf("[WITHINGS DB ERROR] Falló guardar token en kinesys.withings_oauth_tokens: %v", err)
	} else {
		log.Printf("[WITHINGS DB OK] Token persistido en BD para userid=%s (expira en %v)", userid, time.Until(expiresAt).Round(time.Minute))
	}
	return err
}

func (h *WithingsHardwareHandler) performTokenRefresh(ctx context.Context, refreshToken string) (string, string, int, error) {
	form := url.Values{
		"action":        {"requesttoken"},
		"grant_type":    {"refresh_token"},
		"client_id":     {h.clientID},
		"client_secret": {h.clientSecret},
		"refresh_token": {refreshToken},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://wbsapi.withings.net/v2/oauth2", strings.NewReader(form.Encode()))
	if err != nil {
		return "", "", 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return "", "", 0, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", "", 0, fmt.Errorf("refresh failed with status %d", res.StatusCode)
	}

	var payload struct {
		Status int `json:"status"`
		Body   struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			UserID       string `json:"userid"`
			ExpiresIn    int    `json:"expires_in"`
		} `json:"body"`
	}

	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return "", "", 0, err
	}
	if payload.Status != 0 {
		return "", "", 0, fmt.Errorf("withings API status=%d", payload.Status)
	}

	return payload.Body.AccessToken, payload.Body.RefreshToken, payload.Body.ExpiresIn, nil
}

func (h *WithingsHardwareHandler) getValidAccessToken(ctx context.Context, userid string) (string, error) {
	if h.db == nil {
		h.mu.RLock()
		defer h.mu.RUnlock()
		if userid != "" && h.userTokens != nil {
			if t, ok := h.userTokens[userid]; ok && t != "" {
				return t, nil
			}
		}
		if h.lastAccessToken != "" {
			return h.lastAccessToken, nil
		}
		return h.accessToken, nil
	}

	var rowUserID, accessToken, refreshToken string
	var expiresAt time.Time
	var patID *uuid.UUID
	var tID uuid.UUID

	var err error
	if userid != "" {
		err = h.db.QueryRow(ctx, `
			SELECT tenant_id, patient_id, userid, access_token, refresh_token, expires_at 
			FROM kinesys.withings_oauth_tokens 
			WHERE userid = $1 LIMIT 1
		`, userid).Scan(&tID, &patID, &rowUserID, &accessToken, &refreshToken, &expiresAt)
	} else {
		err = h.db.QueryRow(ctx, `
			SELECT tenant_id, patient_id, userid, access_token, refresh_token, expires_at 
			FROM kinesys.withings_oauth_tokens 
			ORDER BY updated_at DESC LIMIT 1
		`).Scan(&tID, &patID, &rowUserID, &accessToken, &refreshToken, &expiresAt)
	}

	if err != nil {
		h.mu.RLock()
		defer h.mu.RUnlock()
		if userid != "" && h.userTokens != nil {
			if t, ok := h.userTokens[userid]; ok && t != "" {
				return t, nil
			}
		}
		if h.lastAccessToken != "" {
			return h.lastAccessToken, nil
		}
		return h.accessToken, nil
	}

	// Renovación automática si está por vencer o vencido
	if time.Now().Add(5*time.Minute).After(expiresAt) && refreshToken != "" {
		log.Printf("[WITHINGS REFRESH] Token próximo a vencer o vencido para userid=%s. Renovando...", rowUserID)
		newAccessToken, newRefreshToken, expiresIn, refreshErr := h.performTokenRefresh(ctx, refreshToken)
		if refreshErr != nil {
			log.Printf("[WITHINGS REFRESH ERROR] Falló renovación para userid=%s: %v. Usando token anterior.", rowUserID, refreshErr)
			return accessToken, nil
		}

		_ = h.saveUserTokens(ctx, &tID, patID, rowUserID, newAccessToken, newRefreshToken, expiresIn)

		h.mu.Lock()
		if h.userTokens == nil {
			h.userTokens = make(map[string]string)
		}
		h.userTokens[rowUserID] = newAccessToken
		h.lastAccessToken = newAccessToken
		h.accessToken = newAccessToken
		h.refreshToken = newRefreshToken
		h.userID = rowUserID
		h.mu.Unlock()

		log.Printf("[WITHINGS TOKEN REFRESH] Tokens renovados exitosamente para userid=%s", rowUserID)
		return newAccessToken, nil
	}

	return accessToken, nil
}

func (h *WithingsHardwareHandler) saveBioimpedanceEvaluation(ctx context.Context, userid string, metrics map[string]float64, payloadDate int64) {
	defaultTenant := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	tenantUUID := defaultTenant
	var patientUUID uuid.UUID

	// 1. Identificar patient_id y tenant_id desde withings_oauth_tokens
	if h.db != nil && userid != "" {
		var pID *uuid.UUID
		var tID uuid.UUID
		if err := h.db.QueryRow(ctx, "SELECT tenant_id, patient_id FROM kinesys.withings_oauth_tokens WHERE userid = $1", userid).Scan(&tID, &pID); err == nil {
			tenantUUID = tID
			if pID != nil && *pID != uuid.Nil {
				patientUUID = *pID
			}
		}
	}

	// 2. Fallback: sesión de pesaje activa
	var pendingSession *domain.ActiveWeighInSession
	if session, err := h.anthropometrySvc.GetLatestPendingWeighInSession(ctx); err == nil && session != nil {
		pendingSession = session
		if patientUUID == uuid.Nil {
			patientUUID = session.PatientID
			tenantUUID = session.TenantID
			// Vincular permanentemente en withings_oauth_tokens
			if h.db != nil && userid != "" {
				_, _ = h.db.Exec(ctx, "UPDATE kinesys.withings_oauth_tokens SET patient_id = $1, tenant_id = $2 WHERE userid = $3", patientUUID, tenantUUID, userid)
			}
		}
	}

	// 3. Fallback: paciente clínico activo más reciente
	if patientUUID == uuid.Nil && h.db != nil {
		_ = h.db.QueryRow(ctx, "SELECT id, tenant_id FROM kinesys.pacientes_clinicos WHERE active = TRUE ORDER BY updated_at DESC LIMIT 1").Scan(&patientUUID, &tenantUUID)
	}

	if patientUUID == uuid.Nil {
		log.Printf("[WITHINGS EVALUATION WARN] No se pudo identificar patient_id para userid=%s", userid)
		return
	}

	// Obtener datos del paciente (ej. estatura)
	var heightCm float64
	patient, err := h.patientService.GetPatient(ctx, patientUUID, tenantUUID)
	if err == nil && patient != nil && patient.HeightCm != nil && *patient.HeightCm > 0 {
		heightCm = *patient.HeightCm
	}

	weightKg := metrics["weight_kg"]
	fatRatio := metrics["fat_ratio_percent"]
	fatMassKg := metrics["fat_mass_kg"]
	muscleMassKg := metrics["muscle_mass_kg"]
	hydrationKg := metrics["hydration_kg"]
	boneMassKg := metrics["bone_mass_kg"]
	visceralFat := metrics["visceral_fat_index"]

	if fatMassKg == 0 && weightKg > 0 && fatRatio > 0 {
		fatMassKg = (weightKg * fatRatio) / 100.0
	}
	if muscleMassKg == 0 && weightKg > 0 && fatMassKg > 0 {
		muscleMassKg = weightKg - fatMassKg
	}

	var bmi float64
	if heightCm > 0 && weightKg > 0 {
		bmi = weightKg / math.Pow(heightCm/100.0, 2)
	}

	// Obtener ID de usuario profesional válido para la FK
	defaultNutriID := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	if h.db != nil {
		var foundID uuid.UUID
		if err := h.db.QueryRow(ctx, "SELECT id FROM kinesys.users WHERE tenant_id = $1 AND role IN ('nutricionista', 'clinic_admin', 'professional') LIMIT 1", tenantUUID).Scan(&foundID); err == nil {
			defaultNutriID = foundID
		} else if err := h.db.QueryRow(ctx, "SELECT id FROM kinesys.users LIMIT 1").Scan(&foundID); err == nil {
			defaultNutriID = foundID
		}
	}

	evalDate := time.Now()
	if payloadDate > 0 {
		evalDate = time.Unix(payloadDate, 0)
	}

	clinicalData := map[string]interface{}{
		"source":              "withings_scale",
		"device_model":        "Withings Body Scan",
		"weight_kg":           math.Round(weightKg*100) / 100,
		"height_cm":           math.Round(heightCm*10) / 10,
		"bmi":                 math.Round(bmi*10) / 10,
		"fat_ratio_percent":   math.Round(fatRatio*10) / 10,
		"body_fat_percentage": math.Round(fatRatio*10) / 10,
		"fat_mass_kg":         math.Round(fatMassKg*10) / 10,
		"muscle_mass_kg":      math.Round(muscleMassKg*10) / 10,
		"hydration_kg":        math.Round(hydrationKg*10) / 10,
		"bone_mass_kg":        math.Round(boneMassKg*10) / 10,
		"visceral_fat_index":  math.Round(visceralFat*10) / 10,
		"clinical_notes":      "Medición sincronizada automáticamente desde Báscula Withings",
	}
	dataJSON, _ := json.Marshal(clinicalData)

	if h.db != nil {
		// Insertar en kinesys.evaluaciones_antropometricas
		_, err := h.db.Exec(ctx, `
			INSERT INTO kinesys.evaluaciones_antropometricas (
				tenant_id, patient_id, nutritionist_id, evaluation_date, data, created_at
			) VALUES ($1, $2, $3, $4, $5, NOW())
		`, tenantUUID, patientUUID, defaultNutriID, evalDate, dataJSON)
		if err != nil {
			log.Printf("[WITHINGS DB ERROR] Falló guardar en evaluaciones_antropometricas: %v", err)
		} else {
			log.Printf("[WITHINGS EVALUATION SAVED] Medición guardada en kinesys.evaluaciones_antropometricas para patient_id=%s (peso=%.2f kg, grasa=%.1f%%)", patientUUID, weightKg, fatRatio)
		}

		// Insertar en kinesys.nutrition_evaluations
		measJSON, _ := json.Marshal(map[string]interface{}{
			"fat_mass_kg":       math.Round(fatMassKg*10) / 10,
			"muscle_mass_kg":    math.Round(muscleMassKg*10) / 10,
			"hydration_kg":      math.Round(hydrationKg*10) / 10,
			"bone_mass_kg":      math.Round(boneMassKg*10) / 10,
			"fat_ratio_percent": math.Round(fatRatio*10) / 10,
		})
		_, _ = h.db.Exec(ctx, `
			INSERT INTO kinesys.nutrition_evaluations (
				tenant_id, patient_id, professional_id, evaluation_date, source,
				weight_kg, height_cm, body_fat_pct, visceral_fat_index, measurements_json
			) VALUES ($1, $2, $3, $4, 'WITHINGS', $5, $6, $7, $8, $9)
		`, tenantUUID, patientUUID, defaultNutriID, evalDate.Format("2006-01-02"), weightKg, heightCm, fatRatio, visceralFat, measJSON)
	}

	// Marcar sesión pendiente como completada
	if pendingSession != nil && pendingSession.PatientID == patientUUID {
		pendingSession.Status = "completed"
		pendingSession.MetricsPayload = dataJSON
		_ = h.anthropometrySvc.UpdateWeighInSession(ctx, pendingSession)
		log.Printf("[WITHINGS SESSION COMPLETED] Sesión %s completada para patient_id=%s", pendingSession.ID, patientUUID)
	}

	if h.db != nil {
		res, err := h.db.Exec(ctx, `
			UPDATE kinesys.active_weigh_in_sessions
			SET status = 'completed', metrics_payload = $1, updated_at = NOW()
			WHERE patient_id = $2 AND LOWER(status) = 'pending'
		`, dataJSON, patientUUID)
		if err == nil {
			if rows := res.RowsAffected(); rows > 0 {
				log.Printf("[WITHINGS SESSION COMPLETED DB] %d sesión(es) pendientes actualizadas a completed para patient_id=%s", rows, patientUUID)
			}
		}
	}
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

	h.mu.Lock()
	if h.userTokens == nil {
		h.userTokens = make(map[string]string)
	}
	h.userTokens[payload.Body.UserID] = payload.Body.AccessToken
	h.lastAccessToken = payload.Body.AccessToken
	h.mu.Unlock()

	log.Printf("[WITHINGS OAUTH] Token guardado en memoria para userid=%s: %s...", payload.Body.UserID, payload.Body.AccessToken[:min(10, len(payload.Body.AccessToken))])
	log.Printf("[WITHINGS OAUTH] Link exitoso para userid=%s", payload.Body.UserID)

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

	parsedMetrics := parseWithingsMeasures(payload.Body.MeasureGroups)
	if pocSessionActive {
		pocMutex.Lock()
		if pocRawPayload == nil {
			pocRawPayload = make(map[string]interface{})
		}
		pocRawPayload["raw_withings_response"] = payload
		pocRawPayload["parsed_metrics"] = parsedMetrics
		pocMutex.Unlock()
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

func parseWithingsMeasures(groups []withingsMeasureGroup) map[string]float64 {
	parsed := make(map[string]float64)
	for _, group := range groups {
		for _, measure := range group.Measures {
			realValue := float64(measure.Value) * math.Pow10(measure.Unit)
			switch measure.Type {
			case 1:
				parsed["weight_kg"] = realValue
			case 5:
				parsed["fat_free_mass_kg"] = realValue
			case 6:
				parsed["fat_ratio_percent"] = realValue
			case 8:
				parsed["fat_mass_kg"] = realValue
			case 11:
				parsed["heart_rate_bpm"] = realValue
			case 76:
				parsed["muscle_mass_kg"] = realValue
			case 77:
				parsed["hydration_kg"] = realValue
			case 88:
				parsed["bone_mass_kg"] = realValue
			case 170:
				parsed["visceral_fat_index"] = realValue
			}
		}
	}
	return parsed
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

	if h.db != nil {
		_, _ = h.db.Exec(r.Context(), `
			UPDATE kinesys.withings_oauth_tokens 
			SET patient_id = $1, tenant_id = $2 
			WHERE patient_id IS NULL OR patient_id = $1
		`, patientUUID, tenantID)
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
	if r.Method == http.MethodGet {
		code := r.URL.Query().Get("code")
		if code != "" {
			// Step 1: Request access token
			data := url.Values{}
			data.Set("action", "requesttoken")
			data.Set("client_id", h.clientID)
			data.Set("client_secret", h.clientSecret)
			data.Set("grant_type", "authorization_code")
			data.Set("code", code)
			data.Set("redirect_uri", "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/webhook")

			resp, err := h.client.PostForm("https://wbsapi.withings.net/v2/oauth2", data)
			if err != nil {
				http.Error(w, "Failed to request token", http.StatusInternalServerError)
				return
			}
			defer resp.Body.Close()

			var oauthResp struct {
				Status int `json:"status"`
				Body   struct {
					UserID       string `json:"userid"`
					AccessToken  string `json:"access_token"`
					RefreshToken string `json:"refresh_token"`
					ExpiresIn    int    `json:"expires_in"`
				} `json:"body"`
			}
			if err := json.NewDecoder(resp.Body).Decode(&oauthResp); err != nil {
				http.Error(w, "Failed to decode token response", http.StatusInternalServerError)
				return
			}

			if oauthResp.Status != 0 || oauthResp.Body.AccessToken == "" {
				http.Error(w, fmt.Sprintf("Withings API error on token exchange: status %d", oauthResp.Status), http.StatusBadGateway)
				return
			}

			userid := oauthResp.Body.UserID
			accessToken := oauthResp.Body.AccessToken
			refreshToken := oauthResp.Body.RefreshToken
			expiresIn := oauthResp.Body.ExpiresIn

			h.mu.Lock()
			if h.userTokens == nil {
				h.userTokens = make(map[string]string)
			}
			h.userTokens[userid] = accessToken
			h.lastAccessToken = accessToken
			h.userID = userid
			h.accessToken = accessToken
			h.refreshToken = refreshToken
			h.mu.Unlock()

			log.Printf("[WITHINGS OAUTH OK] Access Token real asignado para userid=%s (longitud: %d)", userid, len(accessToken))

			// Check if there is an active weigh-in session to link patient_id
			var pendingPatientID *uuid.UUID
			var sessionTenantID *uuid.UUID
			if pendingSession, err := h.anthropometrySvc.GetLatestPendingWeighInSession(r.Context()); err == nil && pendingSession != nil {
				pendingPatientID = &pendingSession.PatientID
				sessionTenantID = &pendingSession.TenantID
			}
			_ = h.saveUserTokens(r.Context(), sessionTenantID, pendingPatientID, userid, accessToken, refreshToken, expiresIn)

			// Step 2: Subscribe webhook
			subData := url.Values{}
			subData.Set("action", "subscribe")
			subData.Set("callbackurl", "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/webhook")
			subData.Set("appli", "1")
			subData.Set("access_token", accessToken)

			subResp, err := h.client.PostForm("https://wbsapi.withings.net/notify", subData)
			if err != nil {
				http.Error(w, "Failed to subscribe webhook", http.StatusInternalServerError)
				return
			}
			defer subResp.Body.Close()

			log.Printf("[WITHINGS OAUTH] Suscripción exitosa para userid=%s", userid)

			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			w.Write([]byte(`<!DOCTYPE html>
<html>
<body style="font-family:sans-serif; text-align:center; padding:50px; background:#0f172a; color:#fff;">
  <h1 style="color:#22c55e;">¡Báscula Vinculada y Suscrita con Éxito!</h1>
  <p>Se ha registrado la suscripción y guardado de credenciales para el usuario de Withings.</p>
  <p>Ya puedes volver a la plataforma (<strong>/#/nutricion</strong> o <strong>/#/withings-poc</strong>) y pesarte.</p>
</body>
</html>`))
			return
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	// Withings sends a POST with application/x-www-form-urlencoded
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	log.Printf("[WITHINGS WEBHOOK] Payload recibido: %v", r.Form)

	userid := r.Form.Get("userid")
	tokenUsed, err := h.getValidAccessToken(r.Context(), userid)
	if err != nil || tokenUsed == "" {
		log.Printf("[WITHINGS GETMEAS ERROR] No hay access_token disponible para userid=%s", userid)
		w.WriteHeader(http.StatusOK)
		return
	}

	log.Printf("[WITHINGS GETMEAS] Ejecutando getmeas para userid=%s usando token=%s...", userid, maskToken(tokenUsed))
	measureForm := url.Values{
		"action":       {"getmeas"},
		"access_token": {tokenUsed},
		"meastypes":    {"1,5,6,8,11,76,77,88,170,123,126,127,135,226"},
	}
	if startDate := r.Form.Get("startdate"); startDate != "" {
		measureForm.Set("startdate", startDate)
	}
	if endDate := r.Form.Get("enddate"); endDate != "" {
		measureForm.Set("enddate", endDate)
	}
	if userid != "" {
		measureForm.Set("userid", userid)
	}

	var parsedMetrics map[string]float64
	var rawMeasurements map[string]interface{}
	var payloadDate int64

	measureReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/measure", strings.NewReader(measureForm.Encode()))
	if err == nil {
		measureReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		measureResp, err := h.client.Do(measureReq)
		if err == nil {
			defer measureResp.Body.Close()
			if decodeErr := json.NewDecoder(measureResp.Body).Decode(&rawMeasurements); decodeErr == nil {
				if rawBytes, marshalErr := json.Marshal(rawMeasurements); marshalErr == nil {
					var parsedResp withingsResponse
					if unmarshalErr := json.Unmarshal(rawBytes, &parsedResp); unmarshalErr == nil && len(parsedResp.Body.MeasureGroups) > 0 {
						parsedMetrics = parseWithingsMeasures(parsedResp.Body.MeasureGroups)
						payloadDate = parsedResp.Body.MeasureGroups[0].Date
					}
				}
			}
		}
	}

	// Update POC cache if active
	pocMutex.Lock()
	if pocSessionActive {
		notification := map[string]string{}
		for _, key := range []string{"userid", "startdate", "enddate"} {
			if val := r.Form.Get(key); val != "" {
				notification[key] = val
			}
		}
		pocRawPayload = map[string]interface{}{
			"notification":              notification,
			"raw_withings_measurements": rawMeasurements,
			"parsed_metrics":            parsedMetrics,
		}
		pocSessionActive = false
		log.Printf("[WITHINGS POC] Payload de prueba capturado con éxito")
	}
	pocMutex.Unlock()

	// Persist bioimpedance measurements to database
	if parsedMetrics != nil && parsedMetrics["weight_kg"] > 0 {
		h.saveBioimpedanceEvaluation(r.Context(), userid, parsedMetrics, payloadDate)
	}

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
