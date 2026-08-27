package domain

import (
	"time"

	"github.com/google/uuid"
)

type AnthropometricEvaluation struct {
	ID                  uuid.UUID      `json:"id"`
	TenantID            uuid.UUID      `json:"tenant_id"`
	PatientID           uuid.UUID      `json:"patient_id"`
	ProfessionalID      uuid.UUID      `json:"professional_id"`
	EvaluationDate      time.Time      `json:"evaluation_date"`
	WeightKg            *float64       `json:"weight_kg,omitempty"`
	HeightCm            *float64       `json:"height_cm,omitempty"`
	BMI                 *float64       `json:"bmi,omitempty"`
	BodyFatPercentage   *float64       `json:"body_fat_percentage,omitempty"`
	MuscleMassKg        *float64       `json:"muscle_mass_kg,omitempty"`
	Skinfolds           map[string]any `json:"skinfolds,omitempty"`
	Circumferences      map[string]any `json:"circumferences,omitempty"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
}
