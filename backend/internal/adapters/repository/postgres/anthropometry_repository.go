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
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Set tenant context for RLS
	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenantID.String()); err != nil {
		return nil, err
	}

	query := `SELECT id, tenant_id, patient_id, professional_id, evaluation_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, skinfolds, circumferences, created_at, updated_at
	          FROM kinesys.evaluaciones_antropometricas WHERE patient_id = $1 AND tenant_id = $2 ORDER BY evaluation_date DESC`
	
	rows, err := tx.Query(ctx, query, patientID, tenantID)
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

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return evals, nil
}

func (r *anthropometryRepository) Create(ctx context.Context, ev *domain.AnthropometricEvaluation) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Set tenant context for RLS
	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", ev.TenantID.String()); err != nil {
		return err
	}

	query := `INSERT INTO kinesys.evaluaciones_antropometricas (tenant_id, patient_id, professional_id, evaluation_date, weight_kg, height_cm, bmi, body_fat_percentage, muscle_mass_kg, skinfolds, circumferences)
	          VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9, $10, $11) RETURNING id, evaluation_date, created_at, updated_at`
	
	err = tx.QueryRow(ctx, query, 
		ev.TenantID, ev.PatientID, ev.ProfessionalID, ev.EvaluationDate,
		ev.WeightKg, ev.HeightCm, ev.BMI, ev.BodyFatPercentage, ev.MuscleMassKg,
		ev.Skinfolds, ev.Circumferences,
	).Scan(&ev.ID, &ev.EvaluationDate, &ev.CreatedAt, &ev.UpdatedAt)

	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *anthropometryRepository) CreateWeighInSession(ctx context.Context, session *domain.ActiveWeighInSession) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Set tenant context for RLS
	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", session.TenantID.String()); err != nil {
		return err
	}

	query := `INSERT INTO kinesys.active_weigh_in_sessions (
		tenant_id, patient_id, status, expires_at
	) VALUES (
		$1, $2, $3, $4
	)
	ON CONFLICT (tenant_id, patient_id) DO UPDATE SET
		status = EXCLUDED.status,
		expires_at = EXCLUDED.expires_at,
		updated_at = NOW()
	RETURNING id, created_at, updated_at`

	// FIX: ensure we use tx.QueryRow and maintain strict $1=tenant, $2=patient order
	err = tx.QueryRow(ctx, query,
		session.TenantID, session.PatientID, session.Status, session.ExpiresAt,
	).Scan(&session.ID, &session.CreatedAt, &session.UpdatedAt)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *anthropometryRepository) GetPendingWeighInSession(ctx context.Context, patientID, tenantID uuid.UUID) (*domain.ActiveWeighInSession, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", tenantID.String()); err != nil {
		return nil, err
	}

	query := `SELECT id, tenant_id, patient_id, status, metrics_payload, created_at, expires_at, updated_at
	          FROM kinesys.active_weigh_in_sessions 
			  WHERE patient_id = $1 AND tenant_id = $2 AND status = 'pending' AND expires_at > NOW()
			  ORDER BY created_at DESC LIMIT 1`
	
	var session domain.ActiveWeighInSession
	err = tx.QueryRow(ctx, query, patientID, tenantID).Scan(
		&session.ID, &session.TenantID, &session.PatientID, &session.Status,
		&session.MetricsPayload, &session.CreatedAt, &session.ExpiresAt, &session.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *anthropometryRepository) GetLatestPendingWeighInSession(ctx context.Context) (*domain.ActiveWeighInSession, error) {
	query := `SELECT id, tenant_id, patient_id, status, metrics_payload, created_at, expires_at, updated_at
	          FROM kinesys.active_weigh_in_sessions 
			  WHERE status = 'pending' AND expires_at > NOW()
			  ORDER BY created_at DESC LIMIT 1`
	
	var session domain.ActiveWeighInSession
	err := r.db.QueryRow(ctx, query).Scan(
		&session.ID, &session.TenantID, &session.PatientID, &session.Status,
		&session.MetricsPayload, &session.CreatedAt, &session.ExpiresAt, &session.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *anthropometryRepository) UpdateWeighInSession(ctx context.Context, session *domain.ActiveWeighInSession) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Set tenant context for RLS
	if _, err := tx.Exec(ctx, "SELECT set_config('app.current_tenant_id', $1, true)", session.TenantID.String()); err != nil {
		return err
	}

	query := `UPDATE kinesys.active_weigh_in_sessions 
			  SET status = $1, metrics_payload = $2, updated_at = NOW() 
			  WHERE id = $3 RETURNING updated_at`
	
	err = tx.QueryRow(ctx, query,
		session.Status, session.MetricsPayload, session.ID,
	).Scan(&session.UpdatedAt)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
