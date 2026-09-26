package handlers

import (
	"encoding/base64"
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestParseWithingsMeasures(t *testing.T) {
	groups := []withingsMeasureGroup{
		{
			Date: 1700000000,
			Measures: []withingsMeasure{
				{Type: 1, Value: 82.5, Unit: 0},
				{Type: 5, Value: 61.2, Unit: 0},
				{Type: 6, Value: 18, Unit: -1},
				{Type: 8, Value: 18.5, Unit: 0},
				{Type: 11, Value: 72, Unit: 0},
				{Type: 76, Value: 31.8, Unit: 0},
				{Type: 77, Value: 52.4, Unit: 0},
				{Type: 88, Value: 2.8, Unit: 0},
				{Type: 170, Value: 9, Unit: 0},
			},
		},
	}

	parsed := parseWithingsMeasures(groups)

	if got, want := parsed["weight_kg"], 82.5; math.Abs(got-want) > 0.0001 {
		t.Fatalf("weight_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_free_mass_kg"], 61.2; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_free_mass_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_ratio_percent"], 1.8; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_ratio_percent mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_mass_kg"], 18.5; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["heart_rate_bpm"], 72.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("heart_rate_bpm mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["muscle_mass_kg"], 31.8; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["hydration_kg"], 52.4; math.Abs(got-want) > 0.0001 {
		t.Fatalf("hydration_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["bone_mass_kg"], 2.8; math.Abs(got-want) > 0.0001 {
		t.Fatalf("bone_mass_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["visceral_fat_index"], 9.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("visceral_fat_index mismatch: got %v want %v", got, want)
	}
	// 82.5 - 18.5 - 52.4 - 2.8 = 8.8 kg
	if got, want := parsed["protein_kg"], 8.8; math.Abs(got-want) > 0.0001 {
		t.Fatalf("protein_kg mismatch: got %v want %v", got, want)
	}
}

func TestParseWithingsMeasures_ProteinFallback(t *testing.T) {
	// Fallback using fat_free_mass_kg when fat_mass_kg is not available
	groups := []withingsMeasureGroup{
		{
			Date: 1700000000,
			Measures: []withingsMeasure{
				{Type: 1, Value: 75.0, Unit: 0},
				{Type: 5, Value: 61.2, Unit: 0}, // fat_free_mass_kg
				{Type: 77, Value: 50.0, Unit: 0}, // hydration_kg
				{Type: 88, Value: 2.5, Unit: 0},  // bone_mass_kg
			},
		},
	}

	parsed := parseWithingsMeasures(groups)
	// 61.2 - 50.0 - 2.5 = 8.7 kg
	if got, want := parsed["protein_kg"], 8.7; math.Abs(got-want) > 0.0001 {
		t.Fatalf("protein_kg fallback mismatch: got %v want %v", got, want)
	}
}

func TestParseWithingsMeasures_DerivedTotals(t *testing.T) {
	// Readings with only Weight and Body Fat % (as from a standard Withings scale)
	groups := []withingsMeasureGroup{
		{
			Date: 1700000000,
			Measures: []withingsMeasure{
				{Type: 1, Value: 80.0, Unit: 0},
				{Type: 6, Value: 20.0, Unit: 0}, // 20% fat
			},
		},
	}

	parsed := parseWithingsMeasures(groups)

	// Verify all total metrics are non-zero and properly calculated
	if parsed["weight_kg"] <= 0 {
		t.Fatalf("expected weight_kg > 0, got %v", parsed["weight_kg"])
	}
	if parsed["fat_mass_kg"] <= 0 {
		t.Fatalf("expected fat_mass_kg > 0, got %v", parsed["fat_mass_kg"])
	}
	if parsed["muscle_mass_kg"] <= 0 {
		t.Fatalf("expected muscle_mass_kg > 0, got %v", parsed["muscle_mass_kg"])
	}
	if parsed["hydration_kg"] <= 0 {
		t.Fatalf("expected hydration_kg > 0, got %v", parsed["hydration_kg"])
	}
	if parsed["bone_mass_kg"] <= 0 {
		t.Fatalf("expected bone_mass_kg > 0, got %v", parsed["bone_mass_kg"])
	}
	if parsed["protein_kg"] <= 0 {
		t.Fatalf("expected protein_kg > 0, got %v", parsed["protein_kg"])
	}

	// fat_mass = 80 * 0.20 = 16.0 kg
	if got, want := parsed["fat_mass_kg"], 16.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_kg mismatch: got %v want %v", got, want)
	}
	// muscle_mass = 80 - 16 = 64.0 kg
	if got, want := parsed["muscle_mass_kg"], 64.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_kg mismatch: got %v want %v", got, want)
	}
	// bone_mass = 80 * 0.04 = 3.2 kg
	if got, want := parsed["bone_mass_kg"], 3.2; math.Abs(got-want) > 0.0001 {
		t.Fatalf("bone_mass_kg mismatch: got %v want %v", got, want)
	}
	// hydration = 64 * 0.732 = 46.8 kg
	if got, want := parsed["hydration_kg"], 46.8; math.Abs(got-want) > 0.0001 {
		t.Fatalf("hydration_kg mismatch: got %v want %v", got, want)
	}
	// protein = 80 - 16 - 46.8 - 3.2 = 14.0 kg
	if got, want := parsed["protein_kg"], 14.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("protein_kg mismatch: got %v want %v", got, want)
	}
}

func TestParseWithingsPocMeasures_Segmental(t *testing.T) {
	posLeftLeg := 1
	posRightLeg := 2
	posLeftArm := 3
	posRightArm := 4
	posTrunk := 5

	groups := []withingsMeasureGroup{
		{
			Date: 1700000000,
			Measures: []withingsMeasure{
				// Totales
				{Type: 1, Value: 75.0, Unit: 0},
				{Type: 76, Value: 35.0, Unit: 0},
				{Type: 8, Value: 15.0, Unit: 0},
				{Type: 77, Value: 42.0, Unit: 0},
				{Type: 88, Value: 3.0, Unit: 0},
				// Segmental músculo (Withings Body Scan)
				{Type: 76, Value: 9.2, Unit: 0, Position: &posLeftLeg},
				{Type: 76, Value: 9.3, Unit: 0, Position: &posRightLeg},
				{Type: 76, Value: 3.5, Unit: 0, Position: &posLeftArm},
				{Type: 76, Value: 3.6, Unit: 0, Position: &posRightArm},
				{Type: 76, Value: 26.5, Unit: 0, Position: &posTrunk},
				// Segmental grasa (Withings Body Scan)
				{Type: 8, Value: 3.1, Unit: 0, Position: &posLeftLeg},
				{Type: 8, Value: 3.2, Unit: 0, Position: &posRightLeg},
				{Type: 8, Value: 1.4, Unit: 0, Position: &posLeftArm},
				{Type: 8, Value: 1.5, Unit: 0, Position: &posRightArm},
				{Type: 8, Value: 7.8, Unit: 0, Position: &posTrunk},
			},
		},
	}

	pocParsed := parseWithingsPocMeasures(groups)

	// Validar que los totales existan
	if pocParsed["weight_kg"] != 75.0 {
		t.Fatalf("expected weight_kg 75.0, got %v", pocParsed["weight_kg"])
	}
	if pocParsed["muscle_mass_kg"] != 35.0 {
		t.Fatalf("expected muscle_mass_kg 35.0, got %v", pocParsed["muscle_mass_kg"])
	}
	if pocParsed["fat_mass_kg"] != 15.0 {
		t.Fatalf("expected fat_mass_kg 15.0, got %v", pocParsed["fat_mass_kg"])
	}

	// Validar masas musculares segmentales
	if pocParsed["muscle_mass_left_leg_kg"] != 9.2 {
		t.Fatalf("expected muscle_mass_left_leg_kg 9.2, got %v", pocParsed["muscle_mass_left_leg_kg"])
	}
	if pocParsed["muscle_mass_right_leg_kg"] != 9.3 {
		t.Fatalf("expected muscle_mass_right_leg_kg 9.3, got %v", pocParsed["muscle_mass_right_leg_kg"])
	}
	if pocParsed["muscle_mass_left_arm_kg"] != 3.5 {
		t.Fatalf("expected muscle_mass_left_arm_kg 3.5, got %v", pocParsed["muscle_mass_left_arm_kg"])
	}
	if pocParsed["muscle_mass_right_arm_kg"] != 3.6 {
		t.Fatalf("expected muscle_mass_right_arm_kg 3.6, got %v", pocParsed["muscle_mass_right_arm_kg"])
	}
	if pocParsed["muscle_mass_trunk_kg"] != 26.5 {
		t.Fatalf("expected muscle_mass_trunk_kg 26.5, got %v", pocParsed["muscle_mass_trunk_kg"])
	}

	// Validar masas grasas segmentales
	if pocParsed["fat_mass_left_leg_kg"] != 3.1 {
		t.Fatalf("expected fat_mass_left_leg_kg 3.1, got %v", pocParsed["fat_mass_left_leg_kg"])
	}
	if pocParsed["fat_mass_right_leg_kg"] != 3.2 {
		t.Fatalf("expected fat_mass_right_leg_kg 3.2, got %v", pocParsed["fat_mass_right_leg_kg"])
	}
	if pocParsed["fat_mass_left_arm_kg"] != 1.4 {
		t.Fatalf("expected fat_mass_left_arm_kg 1.4, got %v", pocParsed["fat_mass_left_arm_kg"])
	}
	if pocParsed["fat_mass_right_arm_kg"] != 1.5 {
		t.Fatalf("expected fat_mass_right_arm_kg 1.5, got %v", pocParsed["fat_mass_right_arm_kg"])
	}
	if pocParsed["fat_mass_trunk_kg"] != 7.8 {
		t.Fatalf("expected fat_mass_trunk_kg 7.8, got %v", pocParsed["fat_mass_trunk_kg"])
	}

	// Validar que parseWithingsMeasures clínico NO tenga las segmentales
	clinicalParsed := parseWithingsMeasures(groups)
	if _, has := clinicalParsed["muscle_mass_left_arm_kg"]; has {
		t.Fatalf("clinical parseWithingsMeasures should NOT contain segmental metrics")
	}
}

func TestHandleAuthorize(t *testing.T) {
	h := NewWithingsHardwareHandler(
		"test_at", "test_rt", "test_user", "https://wbsapi.withings.net", "test_client_id", "test_client_secret",
		nil, nil, nil,
	)

	req := httptest.NewRequest("GET", "/api/v1/hardware/withings/authorize?tenant_id=00000000-0000-0000-0000-000000000001&user_id=11111111-1111-1111-1111-111111111111&format=json", nil)
	w := httptest.NewRecorder()

	h.HandleAuthorize(w, req)

	res := w.Result()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("expected status 200, got %d", res.StatusCode)
	}

	var jsonResp map[string]string
	if err := json.NewDecoder(res.Body).Decode(&jsonResp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	authURL, ok := jsonResp["url"]
	if !ok || authURL == "" {
		t.Fatalf("expected non-empty auth url, got: %v", jsonResp)
	}

	if !strings.Contains(authURL, "account.withings.com") {
		t.Fatalf("expected account.withings.com in authURL, got: %s", authURL)
	}

	if !strings.Contains(authURL, "test_client_id") {
		t.Fatalf("authURL missing client_id: %s", authURL)
	}

	encodedState := jsonResp["state"]
	if encodedState == "" {
		t.Fatalf("expected state in response")
	}

	decodedBytes, err := base64.RawURLEncoding.DecodeString(encodedState)
	if err != nil {
		t.Fatalf("failed to decode state: %v", err)
	}

	var stateMap map[string]interface{}
	if err := json.Unmarshal(decodedBytes, &stateMap); err != nil {
		t.Fatalf("failed to unmarshal state: %v", err)
	}

	if stateMap["tenant_id"] != "00000000-0000-0000-0000-000000000001" {
		t.Fatalf("tenant_id mismatch in state: %v", stateMap["tenant_id"])
	}
	if stateMap["user_id"] != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("user_id mismatch in state: %v", stateMap["user_id"])
	}
}

func TestSaveAdminCredentialsValidation(t *testing.T) {
	h := NewWithingsHardwareHandler(
		"test_at", "test_rt", "test_user", "https://wbsapi.withings.net", "test_client_id", "test_client_secret",
		nil, nil, nil,
	)

	// Missing client_secret
	body := strings.NewReader(`{
		"tenant_id": "00000000-0000-0000-0000-000000000001",
		"nutritionist_id": "11111111-1111-1111-1111-111111111111",
		"client_id": "my_client_id"
	}`)
	req := httptest.NewRequest("POST", "/api/v1/admin/hardware/withings/credentials", body)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.SaveAdminCredentials(w, req)
	if w.Result().StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing client_secret, got %d", w.Result().StatusCode)
	}
}



