package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type anthropometryRepository struct {
	db *pgxpool.Pool
}

func NewAnthropometryRepository(db *pgxpool.Pool) ports.AnthropometryRepository {
	return &anthropometryRepository{db: db}
}

func (r *anthropometryRepository) FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.AnthropometricEvaluation, error) {
	query := `SELECT id, tenant_id, patient_id, professional_id, evaluation_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, skinfolds, circumferences, created_at, updated_at
	          FROM anthropometric_evaluations WHERE patient_id = $1 AND tenant_id = $2 ORDER BY evaluation_date DESC`
	
	rows, err := r.db.Query(ctx, query, patientID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evals []domain.AnthropometricEvaluation
	for rows.Next() {
		var ev domain.AnthropometricEvaluation
		err := rows.Scan(
			&ev.ID, &ev.TenantID, &ev.PatientID, &ev.ProfessionalID, &ev.EvaluationDate,
			&ev.WeightKg, &ev.HeightCm, &ev.BMI, &ev.BodyFatPercentage, &ev.MuscleMassKg,
			&ev.Skinfolds, &ev.Circumferences, &ev.CreatedAt, &ev.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		evals = append(evals, ev)
	}
	return evals, nil
}

func (r *anthropometryRepository) Create(ctx context.Context, ev *domain.AnthropometricEvaluation) error {
	query := `INSERT INTO anthropometric_evaluations (tenant_id, patient_id, professional_id, evaluation_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, skinfolds, circumferences)
	          VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9, $10, $11) RETURNING id, evaluation_date, created_at, updated_at`
	
	return r.db.QueryRow(ctx, query, 
		ev.TenantID, ev.PatientID, ev.ProfessionalID, ev.EvaluationDate,
		ev.WeightKg, ev.HeightCm, ev.BMI, ev.BodyFatPercentage, ev.MuscleMassKg,
		ev.Skinfolds, ev.Circumferences,
	).Scan(&ev.ID, &ev.EvaluationDate, &ev.CreatedAt, &ev.UpdatedAt)
}
