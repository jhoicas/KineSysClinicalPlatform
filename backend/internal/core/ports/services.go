package ports

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
)

type PatientService interface {
	ListPatients(ctx context.Context, tenantID uuid.UUID) ([]domain.Patient, error)
	GetPatient(ctx context.Context, id, tenantID uuid.UUID) (*domain.Patient, error)
	CreatePatient(ctx context.Context, patient *domain.Patient) error
	UpdatePatient(ctx context.Context, patient *domain.Patient) error
}

type EncounterService interface {
	ListEncounters(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.MedicalEncounter, error)
	CreateEncounter(ctx context.Context, encounter *domain.MedicalEncounter) error
}

type AnthropometryService interface {
	ListEvaluations(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.AnthropometricEvaluation, error)
	CreateEvaluation(ctx context.Context, eval *domain.AnthropometricEvaluation) error
	CalculateBMR(weight, height float64, age int, gender string) float64
	CalculateTDEE(bmr float64, activityFactor float64) float64
}

type NutritionService interface {
	ListPlans(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.NutritionPlan, error)
	CreatePlan(ctx context.Context, plan *domain.NutritionPlan) error
}
