package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type WithingsHardwareHandler struct {
	accessToken  string
	refreshToken string
	userID       string
	apiBaseURL   string
	clientID     string
	clientSecret string
	client       *http.Client
}

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
	VisceralFatIndex *float64          `json:"visceral_fat_index"`
	BMR              *float64          `json:"bmr"`
	ProviderMeta     map[string]string `json:"provider_meta,omitempty"`
}

func NewWithingsHardwareHandler(accessToken, refreshToken, userID, apiBaseURL, clientID, clientSecret string) *WithingsHardwareHandler {
	return &WithingsHardwareHandler{
		accessToken:  accessToken,
		refreshToken: refreshToken,
		userID:       userID,
		apiBaseURL:   strings.TrimRight(apiBaseURL, "/"),
		clientID:     clientID,
		clientSecret: clientSecret,
		client:       &http.Client{Timeout: 20 * time.Second},
	}
}

func (h *WithingsHardwareHandler) Sync(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(r.PathValue("patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	if h.accessToken == "" && h.refreshToken == "" {
		http.Error(w, `{"error": "Báscula no vinculada"}`, http.StatusUnauthorized)
		return
	}

	reading, err := h.fetchEvaluation(r.Context(), patientID)
	if err != nil {
		// If unauthorized, try to refresh
		if strings.Contains(err.Error(), "HTTP 401") && h.refreshToken != "" {
			if refreshErr := h.refreshAccessToken(r.Context()); refreshErr == nil {
				// Retry fetch after successful refresh
				reading, err = h.fetchEvaluation(r.Context(), patientID)
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

func (h *WithingsHardwareHandler) fetchEvaluation(ctx context.Context, patientID string) (*WithingsHardwareReading, error) {
	form := url.Values{
		"action":    {"getmeas"},
		"meastypes": {"1,4,6,170,226"},
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
	fat, fatAt := latestMeasure(payload.Body.MeasureGroups, 6)
	visceral, _ := latestMeasure(payload.Body.MeasureGroups, 170)
	bmr, _ := latestMeasure(payload.Body.MeasureGroups, 226)
	measuredAt := weightAt
	if measuredAt == 0 {
		measuredAt = fatAt
	}
	if measuredAt == 0 {
		measuredAt = payload.Body.MeasureGroups[0].Date
	}

	return &WithingsHardwareReading{
		PatientID:        patientID,
		Source:           "WITHINGS",
		EvaluationDate:   time.Unix(measuredAt, 0).UTC().Format("2006-01-02"),
		WeightKg:         scaledValue(weight, 1, 3),
		HeightCm:         scaledValue(height, 100, 2),
		BodyFatPct:       scaledValue(fat, 1, 2),
		VisceralFatIndex: scaledValue(visceral, 1, 2),
		BMR:              scaledValue(bmr, 1, 2),
		ProviderMeta:     map[string]string{"device_model": "Withings Body Scan"},
	}, nil
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
