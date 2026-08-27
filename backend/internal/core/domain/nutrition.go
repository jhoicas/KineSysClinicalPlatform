package domain

import (
	"time"

	"github.com/google/uuid"
)

type NutritionPlan struct {
	ID             uuid.UUID      `json:"id"`
	TenantID       uuid.UUID      `json:"tenant_id"`
	PatientID      uuid.UUID      `json:"patient_id"`
	ProfessionalID uuid.UUID      `json:"professional_id"`
	PlanName       string         `json:"plan_name"`
	PlanType       *string        `json:"plan_type,omitempty"`
	CaloricTarget  *int           `json:"caloric_target_kcal,omitempty"`
	MacrosPct      map[string]any `json:"macros_pct,omitempty"`
	Meals          []map[string]any `json:"meals"`
	Notes          *string        `json:"notes,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}
