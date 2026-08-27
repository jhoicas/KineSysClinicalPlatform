package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type encounterRepository struct {
	db *pgxpool.Pool
}

func NewEncounterRepository(db *pgxpool.Pool) ports.EncounterRepository {
	return &encounterRepository{db: db}
}

func (r *encounterRepository) FindAllByPatient(ctx context.Context, patientID, tenantID uuid.UUID) ([]domain.MedicalEncounter, error) {
	query := `SELECT id, tenant_id, patient_id, professional_id, encounter_date, encounter_type, subjective, objective, assessment, plan, vital_signs, created_at, updated_at
	          FROM medical_encounters WHERE patient_id = $1 AND tenant_id = $2 ORDER BY encounter_date DESC`
	
	rows, err := r.db.Query(ctx, query, patientID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var encounters []domain.MedicalEncounter
	for rows.Next() {
		var e domain.MedicalEncounter
		err := rows.Scan(
			&e.ID, &e.TenantID, &e.PatientID, &e.ProfessionalID, &e.EncounterDate, &e.EncounterType,
			&e.Subjective, &e.Objective, &e.Assessment, &e.Plan, &e.VitalSigns, &e.CreatedAt, &e.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		encounters = append(encounters, e)
	}
	return encounters, nil
}

func (r *encounterRepository) Create(ctx context.Context, e *domain.MedicalEncounter) error {
	query := `INSERT INTO medical_encounters (tenant_id, patient_id, professional_id, encounter_date, encounter_type, subjective, objective, assessment, plan, vital_signs)
	          VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9, $10) RETURNING id, encounter_date, created_at, updated_at`
	
	return r.db.QueryRow(ctx, query, 
		e.TenantID, e.PatientID, e.ProfessionalID, e.EncounterDate, e.EncounterType,
		e.Subjective, e.Objective, e.Assessment, e.Plan, e.VitalSigns,
	).Scan(&e.ID, &e.EncounterDate, &e.CreatedAt, &e.UpdatedAt)
}
