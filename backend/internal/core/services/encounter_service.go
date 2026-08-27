package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type encounterService struct {
	repo      ports.EncounterRepository
	auditRepo ports.AuditRepository
}

func NewEncounterService(repo ports.EncounterRepository, auditRepo ports.AuditRepository) ports.EncounterService {
	return &encounterService{repo: repo, auditRepo: auditRepo}
}

func (s *encounterService) ListEncounters(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.MedicalEncounter, error) {
	return s.repo.FindAllByPatient(ctx, patientID, tenantID)
}

func (s *encounterService) CreateEncounter(ctx context.Context, encounter *domain.MedicalEncounter) error {
	err := s.repo.Create(ctx, encounter)
	if err != nil {
		return err
	}

	// Automatic audit log for clinical encounters
	audit := &domain.ClinicalAuditLog{
		TenantID:   encounter.TenantID,
		UserID:     encounter.ProfessionalID,
		Action:     "CREATE_ENCOUNTER",
		EntityType: "medical_encounter",
		EntityID:   encounter.ID,
	}
	_ = s.auditRepo.Create(ctx, audit) // Fire and forget audit

	return nil
}
