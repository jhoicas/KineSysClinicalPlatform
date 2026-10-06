package domain

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

func TestNewPatientPatch_Valid(t *testing.T) {
	patch, err := NewPatientPatch(map[string]any{
		"height_cm":  172.5,
		"full_name":  "  Ana Pérez  ",
		"email":      "",
		"birth_date": "1990-05-17",
		"allergies":  nil,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	wantColumns := []string{"allergies", "birth_date", "email", "full_name", "height_cm"}
	if got := patch.Columns(); !reflect.DeepEqual(got, wantColumns) {
		t.Fatalf("columns = %v, want %v", got, wantColumns)
	}
	if got := patch.Value("full_name"); got != "Ana Pérez" {
		t.Fatalf("full_name = %v, want trimmed value", got)
	}
	if got := patch.Value("height_cm"); got != 172.5 {
		t.Fatalf("height_cm = %v, want 172.5", got)
	}
	if got := patch.Value("email"); got != nil {
		t.Fatalf("empty email should clear the column, got %v", got)
	}
	if got := patch.Value("allergies"); got != nil {
		t.Fatalf("null allergies should clear the column, got %v", got)
	}
}

func TestNewPatientPatch_Invalid(t *testing.T) {
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")

	tests := []struct {
		name string
		in   map[string]any
	}{
		{"empty patch", map[string]any{}},
		{"nil patch", nil},
		{"unknown field", map[string]any{"role": "admin"}},
		{"tenant_id is protected", map[string]any{"tenant_id": "x"}},
		{"id is protected", map[string]any{"id": "x"}},
		{"sql injection in field name", map[string]any{"full_name = 'x'; --": "y"}},
		{"height zero", map[string]any{"height_cm": 0.0}},
		{"height negative", map[string]any{"height_cm": -170.0}},
		{"height above max", map[string]any{"height_cm": 301.0}},
		{"height wrong type", map[string]any{"height_cm": "172"}},
		{"full_name null", map[string]any{"full_name": nil}},
		{"full_name blank", map[string]any{"full_name": "   "}},
		{"full_name too long", map[string]any{"full_name": strings.Repeat("a", 256)}},
		{"text wrong type", map[string]any{"phone": 12345.0}},
		{"birth_date malformed", map[string]any{"birth_date": "17/05/1990"}},
		{"birth_date future", map[string]any{"birth_date": tomorrow}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewPatientPatch(tt.in)
			if !errors.Is(err, ErrInvalidPatientPatch) {
				t.Fatalf("err = %v, want ErrInvalidPatientPatch", err)
			}
		})
	}
}

func TestNewPatientPatch_HeightBoundary(t *testing.T) {
	if _, err := NewPatientPatch(map[string]any{"height_cm": float64(MaxPatientHeightCm)}); err != nil {
		t.Fatalf("height at max should be valid: %v", err)
	}
	if _, err := NewPatientPatch(map[string]any{"height_cm": nil}); err != nil {
		t.Fatalf("null height should clear the column: %v", err)
	}
}
