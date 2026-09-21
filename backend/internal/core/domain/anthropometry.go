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

type BiologicalSex string

const (
	SexMale   BiologicalSex = "male"
	SexFemale BiologicalSex = "female"
)

type BodyCompositionResult struct {
	BodyDensity   *float64 `json:"body_density"` // null si no se calcula (Faulkner)
	BodyFatPct    float64  `json:"body_fat_pct"`
	FatMassKg     *float64 `json:"fat_mass_kg"`
	FatFreeMassKg *float64 `json:"fat_free_mass_kg"`
	Formula       string   `json:"formula"`
}

type JacksonPollock7Skinfolds struct {
	Chest       float64
	Midaxillary float64
	Triceps     float64
	Subscapular float64
	Abdomen     float64
	Suprailiac  float64
	Thigh       float64
}

type JacksonPollock3SkinfoldsMale struct {
	Chest   float64
	Abdomen float64
	Thigh   float64
}

type JacksonPollock3SkinfoldsFemale struct {
	Triceps    float64
	Suprailiac float64
	Thigh      float64
}

type Faulkner4Skinfolds struct {
	Triceps     float64
	Subscapular float64
	Suprailiac  float64
	Abdomen     float64
}

type HeathCarterInputs struct {
	TricepsMm        float64
	SubscapularMm    float64
	SuprailiacMm     float64
	MedialCalfMm     float64
	HumerusBreadthCm float64
	FemurBreadthCm   float64
	FlexedArmCm      float64
	CalfCm           float64
	HeightCm         float64
	WeightKg         float64
}

type SomatotypeResult struct {
	Endomorphy float64 `json:"endomorphy"`
	Mesomorphy float64 `json:"mesomorphy"`
	Ectomorphy float64 `json:"ectomorphy"`
	Label      string  `json:"label"`
}

type BmrInputs struct {
	WeightKg float64
	HeightCm float64
	AgeYears int
	Sex      BiologicalSex
}

type BmrResult struct {
	BmrKcal float64 `json:"bmr_kcal"`
	Formula string  `json:"formula"`
}

type ActiveWeighInSession struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	PatientID      uuid.UUID `json:"patient_id"`
	Status         string    `json:"status"` // "pending", "completed", "expired"
	MetricsPayload []byte    `json:"metrics_payload,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	ExpiresAt      time.Time `json:"expires_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

