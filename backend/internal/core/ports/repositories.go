package ports

import (
	"context"
	"time"

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
	CreateWeighInSession(ctx context.Context, session *domain.ActiveWeighInSession) error
	GetPendingWeighInSession(ctx context.Context, patientID uuid.UUID) (*domain.ActiveWeighInSession, error)
	GetLatestPendingWeighInSession(ctx context.Context) (*domain.ActiveWeighInSession, error)
	GetPendingSessionByTenantAndNutritionist(ctx context.Context, tenantID, nutritionistID uuid.UUID) (*domain.ActiveWeighInSession, error)
	UpdateWeighInSession(ctx context.Context, session *domain.ActiveWeighInSession) error
}

type WithingsRepository interface {
	FindByWithingsUserID(ctx context.Context, withingsUserID string) (*domain.WithingsIntegration, error)
	FindByNutritionist(ctx context.Context, tenantID, nutritionistID uuid.UUID) (*domain.WithingsIntegration, error)
	Upsert(ctx context.Context, integration *domain.WithingsIntegration) error
	UpdateTokens(ctx context.Context, withingsUserID, accessToken, refreshToken string, expiresAt time.Time) error
}

type NutritionRepository interface {
	FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.NutritionPlan, error)
	Create(ctx context.Context, plan *domain.NutritionPlan) error
}

type AuditRepository interface {
	Create(ctx context.Context, log *domain.ClinicalAuditLog) error
}

type ExerciseRepository interface {
	List(ctx context.Context, userID, tenantID uuid.UUID, search, category string) ([]domain.Exercise, error)
	Create(ctx context.Context, exercise *domain.Exercise) error
}
