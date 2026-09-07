package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type exerciseService struct {
	repo ports.ExerciseRepository
}

func NewExerciseService(repo ports.ExerciseRepository) ports.ExerciseService {
	return &exerciseService{repo: repo}
}

func (s *exerciseService) List(ctx context.Context, userID, tenantID uuid.UUID, search, category string) ([]domain.Exercise, error) {
	return s.repo.List(ctx, userID, tenantID, search, category)
}

func (s *exerciseService) Create(ctx context.Context, exercise *domain.Exercise) error {
	exercise.IsSystem = false
	exercise.AuthorAttribution = ""
	return s.repo.Create(ctx, exercise)
}
