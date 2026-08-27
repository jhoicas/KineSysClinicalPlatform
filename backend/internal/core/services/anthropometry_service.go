package services

import (
	"context"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type anthropometryService struct {
	repo ports.AnthropometryRepository
}

func NewAnthropometryService(repo ports.AnthropometryRepository) ports.AnthropometryService {
	return &anthropometryService{repo: repo}
}

func (s *anthropometryService) ListEvaluations(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.AnthropometricEvaluation, error) {
	return s.repo.FindAllByPatient(ctx, patientID, tenantID)
}

func (s *anthropometryService) CreateEvaluation(ctx context.Context, eval *domain.AnthropometricEvaluation) error {
	// Optional: Add calculation logic here if the frontend passes raw data (e.g., automatically calculate BMI)
	if eval.WeightKg != nil && eval.HeightCm != nil && *eval.HeightCm > 0 {
		bmi := *eval.WeightKg / ((*eval.HeightCm / 100) * (*eval.HeightCm / 100))
		eval.BMI = &bmi
	}
	return s.repo.Create(ctx, eval)
}

// CalculateBMR calculates Basal Metabolic Rate using Mifflin-St Jeor equation
func (s *anthropometryService) CalculateBMR(weight, height float64, age int, gender string) float64 {
	// Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
	// Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
	base := (10 * weight) + (6.25 * height) - float64(5*age)
	if gender == "male" {
		return base + 5
	}
	return base - 161
}

// CalculateTDEE calculates Total Daily Energy Expenditure
func (s *anthropometryService) CalculateTDEE(bmr float64, activityFactor float64) float64 {
	return bmr * activityFactor
}
