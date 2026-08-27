package ports

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
)

type PatientRepository interface {
	FindAllByTenant(ctx context.Context, tenantID uuid.UUID) ([]domain.Patient, error)
	FindByIDAndTenant(ctx context.Context, id, tenantID uuid.UUID) (*domain.Patient, error)
	Create(ctx context.Context, patient *domain.Patient) error
	Update(ctx context.Context, patient *domain.Patient) error
}

type EncounterRepository interface {
	FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.MedicalEncounter, error)
	Create(ctx context.Context, encounter *domain.MedicalEncounter) error
}

type AnthropometryRepository interface {
	FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.AnthropometricEvaluation, error)
	Create(ctx context.Context, eval *domain.AnthropometricEvaluation) error
}

type NutritionRepository interface {
	FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.NutritionPlan, error)
	Create(ctx context.Context, plan *domain.NutritionPlan) error
}

type AuditRepository interface {
	Create(ctx context.Context, log *domain.ClinicalAuditLog) error
}
