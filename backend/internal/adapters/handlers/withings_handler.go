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
	accessToken string
	userID      string
	apiBaseURL  string
	client      *http.Client
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

func NewWithingsHardwareHandler(accessToken, userID, apiBaseURL string) *WithingsHardwareHandler {
	return &WithingsHardwareHandler{
		accessToken: accessToken,
		userID:      userID,
		apiBaseURL:  strings.TrimRight(apiBaseURL, "/"),
		client:      &http.Client{Timeout: 20 * time.Second},
	}
}

func (h *WithingsHardwareHandler) Sync(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(r.PathValue("patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	if h.accessToken == "" || h.userID == "" {
		http.Error(w, "Withings hardware is not configured", http.StatusServiceUnavailable)
		return
	}

	reading, err := h.fetchEvaluation(r.Context(), patientID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reading)
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
