package handlers

import (
	"math"
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

func TestParseWithingsMeasures_Segmental(t *testing.T) {
	posLeftLeg := 1
	posRightLeg := 2
	posLeftArm := 3
	posRightArm := 4
	posTrunk := 5
	posTotal := 7

	groups := []withingsMeasureGroup{
		{
			Date: 1700000000,
			Measures: []withingsMeasure{
				// Total
				{Type: 1, Value: 75.0, Unit: 0},
				{Type: 76, Value: 35.0, Unit: 0, Position: &posTotal},
				{Type: 8, Value: 15.0, Unit: 0, Position: &posTotal},
				// Segmental muscle
				{Type: 76, Value: 9.2, Unit: 0, Position: &posLeftLeg},
				{Type: 76, Value: 9.3, Unit: 0, Position: &posRightLeg},
				{Type: 76, Value: 3.5, Unit: 0, Position: &posLeftArm},
				{Type: 76, Value: 3.6, Unit: 0, Position: &posRightArm},
				{Type: 76, Value: 26.5, Unit: 0, Position: &posTrunk},
				// Segmental fat
				{Type: 8, Value: 3.1, Unit: 0, Position: &posLeftLeg},
				{Type: 8, Value: 3.2, Unit: 0, Position: &posRightLeg},
				{Type: 8, Value: 1.4, Unit: 0, Position: &posLeftArm},
				{Type: 8, Value: 1.5, Unit: 0, Position: &posRightArm},
				{Type: 8, Value: 7.8, Unit: 0, Position: &posTrunk},
			},
		},
	}

	parsed := parseWithingsMeasures(groups)

	// Muscle assertions
	if got, want := parsed["muscle_mass_kg"], 35.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["muscle_mass_left_leg_kg"], 9.2; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_left_leg_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["muscle_mass_right_leg_kg"], 9.3; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_right_leg_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["muscle_mass_left_arm_kg"], 3.5; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_left_arm_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["muscle_mass_right_arm_kg"], 3.6; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_right_arm_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["muscle_mass_trunk_kg"], 26.5; math.Abs(got-want) > 0.0001 {
		t.Fatalf("muscle_mass_trunk_kg mismatch: got %v want %v", got, want)
	}

	// Fat assertions
	if got, want := parsed["fat_mass_kg"], 15.0; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_mass_left_leg_kg"], 3.1; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_left_leg_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_mass_right_leg_kg"], 3.2; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_right_leg_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_mass_left_arm_kg"], 1.4; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_left_arm_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_mass_right_arm_kg"], 1.5; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_right_arm_kg mismatch: got %v want %v", got, want)
	}
	if got, want := parsed["fat_mass_trunk_kg"], 7.8; math.Abs(got-want) > 0.0001 {
		t.Fatalf("fat_mass_trunk_kg mismatch: got %v want %v", got, want)
	}
}


