package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type nutritionRepository struct {
	db *pgxpool.Pool
}

func NewNutritionRepository(db *pgxpool.Pool) ports.NutritionRepository {
	return &nutritionRepository{db: db}
}

func (r *nutritionRepository) FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.NutritionPlan, error) {
	query := `SELECT id, tenant_id, patient_id, professional_id, plan_name, plan_type, caloric_target_kcal, macros_pct, meals, notes, created_at, updated_at
	          FROM nutrition_plans WHERE patient_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`
	
	rows, err := r.db.Query(ctx, query, patientID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []domain.NutritionPlan
	for rows.Next() {
		var p domain.NutritionPlan
		err := rows.Scan(
			&p.ID, &p.TenantID, &p.PatientID, &p.ProfessionalID, &p.PlanName, &p.PlanType,
			&p.CaloricTarget, &p.MacrosPct, &p.Meals, &p.Notes, &p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (r *nutritionRepository) Create(ctx context.Context, p *domain.NutritionPlan) error {
	query := `INSERT INTO nutrition_plans (tenant_id, patient_id, professional_id, plan_name, plan_type, caloric_target_kcal, macros_pct, meals, notes)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at, updated_at`
	
	return r.db.QueryRow(ctx, query, 
		p.TenantID, p.PatientID, p.ProfessionalID, p.PlanName, p.PlanType,
		p.CaloricTarget, p.MacrosPct, p.Meals, p.Notes,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}
