package postgres

import (
	"reflect"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
)

func TestBuildPatientPatchQuery(t *testing.T) {
	patch, err := domain.NewPatientPatch(map[string]any{
		"height_cm": 180.0,
		"phone":     nil,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	id, tenantID := uuid.New(), uuid.New()

	query, args := buildPatientPatchQuery(id, tenantID, patch)

	wantPrefix := "UPDATE patients SET height_cm = $1, phone = $2 WHERE id = $3 AND tenant_id = $4 RETURNING "
	if !strings.HasPrefix(query, wantPrefix) {
		t.Fatalf("query = %q, want prefix %q", query, wantPrefix)
	}
	wantArgs := []any{180.0, nil, id, tenantID}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("args = %v, want %v", args, wantArgs)
	}
	if strings.Contains(query, "updated_at =") {
		t.Fatalf("updated_at must be managed by the trigger, got %q", query)
	}
}

func TestBuildPatientPatchQuery_ValuesNeverInlined(t *testing.T) {
	patch, err := domain.NewPatientPatch(map[string]any{"full_name": "Robert'); DROP TABLE patients;--"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	query, args := buildPatientPatchQuery(uuid.New(), uuid.New(), patch)

	if strings.Contains(query, "DROP TABLE") {
		t.Fatalf("value leaked into SQL text: %q", query)
	}
	if args[0] != "Robert'); DROP TABLE patients;--" {
		t.Fatalf("value must travel as a parameter, got %v", args[0])
	}
}
