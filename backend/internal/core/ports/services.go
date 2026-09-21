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
	CalculateJacksonPollock7(sex domain.BiologicalSex, age int, folds domain.JacksonPollock7Skinfolds, weightKg *float64) (domain.BodyCompositionResult, error)
	CalculateJacksonPollock3Male(age int, folds domain.JacksonPollock3SkinfoldsMale, weightKg *float64) (domain.BodyCompositionResult, error)
	CalculateJacksonPollock3Female(age int, folds domain.JacksonPollock3SkinfoldsFemale, weightKg *float64) (domain.BodyCompositionResult, error)
	CalculateFaulkner4(folds domain.Faulkner4Skinfolds, weightKg *float64) (domain.BodyCompositionResult, error)
	CalculateHeathCarterSomatotype(inputs domain.HeathCarterInputs) (domain.SomatotypeResult, error)
	CalculateMifflinStJeor(inputs domain.BmrInputs) (domain.BmrResult, error)
	CalculateHarrisBenedict(inputs domain.BmrInputs) (domain.BmrResult, error)
	CalculateTDEE(bmr float64, activityFactor float64) (float64, error)
	CreateWeighInSession(ctx context.Context, session *domain.ActiveWeighInSession) error
	GetPendingWeighInSession(ctx context.Context, patientID, tenantID uuid.UUID) (*domain.ActiveWeighInSession, error)
	GetLatestPendingWeighInSession(ctx context.Context) (*domain.ActiveWeighInSession, error)
	UpdateWeighInSession(ctx context.Context, session *domain.ActiveWeighInSession) error
}

type NutritionService interface {
	ListPlans(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.NutritionPlan, error)
	CreatePlan(ctx context.Context, plan *domain.NutritionPlan) error
}

type DietPlannerService interface {
	ScaleNutrientPer100g(portionG float64, nutrientPer100g *float64) float64
	EstimateItemCost(portionG float64, food domain.FoodCatalogNutrients) *float64
	CalculateDietPlanTotals(items []domain.DietItemWithFood) (domain.DietPlanTotals, error)
}

type GroceryListService interface {
	ParsePurchaseUnitGrams(raw *string) *float64
	GenerateSmartGroceryList(planItems []domain.GroceryPlanItem, days int) (domain.SmartGroceryList, error)
}

type ExerciseService interface {
	List(ctx context.Context, userID, tenantID uuid.UUID, search, category string) ([]domain.Exercise, error)
	Create(ctx context.Context, exercise *domain.Exercise) error
}
