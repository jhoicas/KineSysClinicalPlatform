package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type patientService struct {
	repo ports.PatientRepository
}

func NewPatientService(repo ports.PatientRepository) ports.PatientService {
	return &patientService{repo: repo}
}

func (s *patientService) ListPatients(ctx context.Context, tenantID uuid.UUID) ([]domain.Patient, error) {
	return s.repo.FindAllByTenant(ctx, tenantID)
}

func (s *patientService) GetPatient(ctx context.Context, id, tenantID uuid.UUID) (*domain.Patient, error) {
	return s.repo.FindByIDAndTenant(ctx, id, tenantID)
}

func (s *patientService) CreatePatient(ctx context.Context, patient *domain.Patient) error {
	// TODO: Add RUT/DNI format validation here
	return s.repo.Create(ctx, patient)
}

func (s *patientService) UpdatePatient(ctx context.Context, patient *domain.Patient) error {
	// TODO: Add RUT/DNI format validation here
	return s.repo.Update(ctx, patient)
}
