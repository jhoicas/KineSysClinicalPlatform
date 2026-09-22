package postgres

import (
	"context"
	"encoding/json"
	"log"

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

	query := `SELECT id, tenant_id, patient_id, nutritionist_id, evaluation_date, data, created_at
	          FROM kinesys.evaluaciones_antropometricas WHERE patient_id = $1 AND tenant_id = $2 ORDER BY evaluation_date DESC`
	
	rows, err := tx.Query(ctx, query, patientID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var evals []domain.AnthropometricEvaluation
	for rows.Next() {
		var ev domain.AnthropometricEvaluation
		var dataRaw []byte
		err := rows.Scan(
			&ev.ID, &ev.TenantID, &ev.PatientID, &ev.ProfessionalID, &ev.EvaluationDate,
			&dataRaw, &ev.CreatedAt,
		)
		if err != nil {
			return nil, err
		}

		if len(dataRaw) > 0 {
			var dataMap map[string]interface{}
			if err := json.Unmarshal(dataRaw, &dataMap); err == nil {
				if v, ok := dataMap["weight_kg"].(float64); ok {
					ev.WeightKg = &v
				}
				if v, ok := dataMap["height_cm"].(float64); ok {
					ev.HeightCm = &v
				}
				if v, ok := dataMap["bmi"].(float64); ok {
					ev.BMI = &v
				}
				if v, ok := dataMap["body_fat_percentage"].(float64); ok {
					ev.BodyFatPercentage = &v
				} else if v, ok := dataMap["fat_ratio_percent"].(float64); ok {
					ev.BodyFatPercentage = &v
				}
				if v, ok := dataMap["muscle_mass_kg"].(float64); ok {
					ev.MuscleMassKg = &v
				}
				if v, ok := dataMap["skinfolds"].(map[string]interface{}); ok {
					ev.Skinfolds = v
				}
				if v, ok := dataMap["circumferences"].(map[string]interface{}); ok {
					ev.Circumferences = v
				}
			}
		}
		ev.UpdatedAt = ev.CreatedAt
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

	dataMap := map[string]interface{}{}
	if ev.WeightKg != nil {
		dataMap["weight_kg"] = *ev.WeightKg
	}
	if ev.HeightCm != nil {
		dataMap["height_cm"] = *ev.HeightCm
	}
	if ev.BMI != nil {
		dataMap["bmi"] = *ev.BMI
	}
	if ev.BodyFatPercentage != nil {
		dataMap["body_fat_percentage"] = *ev.BodyFatPercentage
		dataMap["fat_ratio_percent"] = *ev.BodyFatPercentage
	}
	if ev.MuscleMassKg != nil {
		dataMap["muscle_mass_kg"] = *ev.MuscleMassKg
	}
	if ev.Skinfolds != nil {
		dataMap["skinfolds"] = ev.Skinfolds
	}
	if ev.Circumferences != nil {
		dataMap["circumferences"] = ev.Circumferences
	}
	dataJSON, _ := json.Marshal(dataMap)

	query := `INSERT INTO kinesys.evaluaciones_antropometricas (tenant_id, patient_id, nutritionist_id, evaluation_date, data)
	          VALUES ($1, $2, $3, COALESCE($4, NOW()), $5) RETURNING id, evaluation_date, created_at`
	
	err = tx.QueryRow(ctx, query, 
		ev.TenantID, ev.PatientID, ev.ProfessionalID, ev.EvaluationDate, dataJSON,
	).Scan(&ev.ID, &ev.EvaluationDate, &ev.CreatedAt)

	if err != nil {
		return err
	}
	ev.UpdatedAt = ev.CreatedAt
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
		metrics_payload = NULL,
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

func (r *anthropometryRepository) GetPendingWeighInSession(ctx context.Context, patientID uuid.UUID) (*domain.ActiveWeighInSession, error) {
	query := `SELECT id, tenant_id, patient_id, status, metrics_payload, created_at, expires_at, updated_at
	          FROM kinesys.active_weigh_in_sessions 
			  WHERE patient_id = $1 
			    AND (LOWER(status) = 'pending' OR (LOWER(status) = 'completed' AND updated_at > NOW() - INTERVAL '10 minutes'))
			  ORDER BY updated_at DESC LIMIT 1`
	
	var session domain.ActiveWeighInSession
	err := r.db.QueryRow(ctx, query, patientID).Scan(
		&session.ID, &session.TenantID, &session.PatientID, &session.Status,
		&session.MetricsPayload, &session.CreatedAt, &session.ExpiresAt, &session.UpdatedAt,
	)
	if err != nil {
		log.Printf("[WITHINGS] No se encontró sesión PENDING/COMPLETED en BD para patient_id=%s: %v", patientID, err)
		return nil, err
	}
	return &session, nil
}

func (r *anthropometryRepository) GetLatestPendingWeighInSession(ctx context.Context) (*domain.ActiveWeighInSession, error) {
	query := `SELECT id, tenant_id, patient_id, status, metrics_payload, created_at, expires_at, updated_at
	          FROM kinesys.active_weigh_in_sessions 
			  WHERE LOWER(status) = 'pending' AND expires_at > NOW()
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
	query := `UPDATE kinesys.active_weigh_in_sessions 
			  SET status = $1, metrics_payload = $2, updated_at = NOW() 
			  WHERE id = $3 RETURNING updated_at`
	
	return r.db.QueryRow(ctx, query,
		session.Status, session.MetricsPayload, session.ID,
	).Scan(&session.UpdatedAt)
}
