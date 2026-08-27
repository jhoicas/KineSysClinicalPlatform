package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type patientRepository struct {
	db *pgxpool.Pool
}

func NewPatientRepository(db *pgxpool.Pool) ports.PatientRepository {
	return &patientRepository{db: db}
}

func (r *patientRepository) FindAllByTenant(ctx context.Context, tenantID uuid.UUID) ([]domain.Patient, error) {
	query := `SELECT id, tenant_id, rut_or_dni, full_name, email, phone, birth_date, gender, blood_type, medical_conditions, allergies, emergency_contact_name, emergency_contact_phone, created_at, updated_at
	          FROM patients WHERE tenant_id = $1 ORDER BY created_at DESC`
	
	rows, err := r.db.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var patients []domain.Patient
	for rows.Next() {
		var p domain.Patient
		err := rows.Scan(
			&p.ID, &p.TenantID, &p.RutOrDni, &p.FullName, &p.Email, &p.Phone, 
			&p.BirthDate, &p.Gender, &p.BloodType, &p.MedicalConditions, 
			&p.Allergies, &p.EmergencyContactName, &p.EmergencyContactPhone, 
			&p.CreatedAt, &p.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		patients = append(patients, p)
	}
	return patients, nil
}

func (r *patientRepository) FindByIDAndTenant(ctx context.Context, id, tenantID uuid.UUID) (*domain.Patient, error) {
	query := `SELECT id, tenant_id, rut_or_dni, full_name, email, phone, birth_date, gender, blood_type, medical_conditions, allergies, emergency_contact_name, emergency_contact_phone, created_at, updated_at
	          FROM patients WHERE id = $1 AND tenant_id = $2`
	
	var p domain.Patient
	err := r.db.QueryRow(ctx, query, id, tenantID).Scan(
		&p.ID, &p.TenantID, &p.RutOrDni, &p.FullName, &p.Email, &p.Phone, 
		&p.BirthDate, &p.Gender, &p.BloodType, &p.MedicalConditions, 
		&p.Allergies, &p.EmergencyContactName, &p.EmergencyContactPhone, 
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *patientRepository) Create(ctx context.Context, p *domain.Patient) error {
	query := `INSERT INTO patients (tenant_id, rut_or_dni, full_name, email, phone, birth_date, gender, blood_type, medical_conditions, allergies, emergency_contact_name, emergency_contact_phone)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, created_at, updated_at`
	
	return r.db.QueryRow(ctx, query, 
		p.TenantID, p.RutOrDni, p.FullName, p.Email, p.Phone, p.BirthDate, 
		p.Gender, p.BloodType, p.MedicalConditions, p.Allergies, 
		p.EmergencyContactName, p.EmergencyContactPhone,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (r *patientRepository) Update(ctx context.Context, p *domain.Patient) error {
	query := `UPDATE patients SET rut_or_dni = $1, full_name = $2, email = $3, phone = $4, birth_date = $5, gender = $6, blood_type = $7, medical_conditions = $8, allergies = $9, emergency_contact_name = $10, emergency_contact_phone = $11
	          WHERE id = $12 AND tenant_id = $13 RETURNING updated_at`
	
	return r.db.QueryRow(ctx, query, 
		p.RutOrDni, p.FullName, p.Email, p.Phone, p.BirthDate, 
		p.Gender, p.BloodType, p.MedicalConditions, p.Allergies, 
		p.EmergencyContactName, p.EmergencyContactPhone,
		p.ID, p.TenantID,
	).Scan(&p.UpdatedAt)
}
