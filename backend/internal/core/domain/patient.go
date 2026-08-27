package domain

import (
	"time"

	"github.com/google/uuid"
)

type Patient struct {
	ID                    uuid.UUID `json:"id"`
	TenantID              uuid.UUID `json:"tenant_id"`
	RutOrDni              *string   `json:"rut_or_dni,omitempty"`
	FullName              string    `json:"full_name"`
	Email                 *string   `json:"email,omitempty"`
	Phone                 *string   `json:"phone,omitempty"`
	BirthDate             *string   `json:"birth_date,omitempty"` // YYYY-MM-DD
	Gender                *string   `json:"gender,omitempty"`
	BloodType             *string   `json:"blood_type,omitempty"`
	MedicalConditions     *string   `json:"medical_conditions,omitempty"`
	Allergies             *string   `json:"allergies,omitempty"`
	EmergencyContactName  *string   `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone *string   `json:"emergency_contact_phone,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}
