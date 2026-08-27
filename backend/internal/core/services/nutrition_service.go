package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type nutritionService struct {
	repo ports.NutritionRepository
}

func NewNutritionService(repo ports.NutritionRepository) ports.NutritionService {
	return &nutritionService{repo: repo}
}

func (s *nutritionService) ListPlans(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.NutritionPlan, error) {
	return s.repo.FindAllByPatient(ctx, patientID, tenantID)
}

func (s *nutritionService) CreatePlan(ctx context.Context, plan *domain.NutritionPlan) error {
	return s.repo.Create(ctx, plan)
}
