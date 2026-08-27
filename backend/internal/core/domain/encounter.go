package domain

import (
	"time"

	"github.com/google/uuid"
)

type MedicalEncounter struct {
	ID             uuid.UUID      `json:"id"`
	TenantID       uuid.UUID      `json:"tenant_id"`
	PatientID      uuid.UUID      `json:"patient_id"`
	ProfessionalID uuid.UUID      `json:"professional_id"`
	EncounterDate  time.Time      `json:"encounter_date"`
	EncounterType  string         `json:"encounter_type"`
	Subjective     *string        `json:"subjective,omitempty"`
	Objective      *string        `json:"objective,omitempty"`
	Assessment     *string        `json:"assessment,omitempty"`
	Plan           *string        `json:"plan,omitempty"`
	VitalSigns     map[string]any `json:"vital_signs,omitempty"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

type Prescription struct {
	ID             uuid.UUID      `json:"id"`
	TenantID       uuid.UUID      `json:"tenant_id"`
	EncounterID    *uuid.UUID     `json:"encounter_id,omitempty"`
	PatientID      uuid.UUID      `json:"patient_id"`
	ProfessionalID uuid.UUID      `json:"professional_id"`
	Medications    []map[string]any `json:"medications"`
	Instructions   *string        `json:"instructions,omitempty"`
	ValidUntil     *string        `json:"valid_until,omitempty"` // YYYY-MM-DD
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}
