package domain

import (
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

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
	HeightCm              *float64  `json:"height_cm,omitempty" db:"height_cm"`
	Gender                *string   `json:"gender,omitempty"`
	BloodType             *string   `json:"blood_type,omitempty"`
	MedicalConditions     *string   `json:"medical_conditions,omitempty"`
	Allergies             *string   `json:"allergies,omitempty"`
	EmergencyContactName  *string   `json:"emergency_contact_name,omitempty"`
	EmergencyContactPhone *string   `json:"emergency_contact_phone,omitempty"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`
}

var (
	// ErrPatientNotFound indica que el paciente no existe dentro del tenant.
	ErrPatientNotFound = errors.New("patient not found")
	// ErrInvalidPatientPatch indica que el parche contiene campos o valores inválidos.
	ErrInvalidPatientPatch = errors.New("invalid patient patch")
)

// MaxPatientHeightCm es el límite superior de estatura aceptado (alineado con la
// restricción patients_height_max y con patientSchema.ts del frontend).
const MaxPatientHeightCm = 300

type patchFieldKind int

const (
	patchText patchFieldKind = iota
	patchDate
	patchHeight
)

type patchFieldRule struct {
	kind     patchFieldKind
	maxLen   int  // longitud máxima para patchText
	nullable bool // si es false, el valor no puede ser null ni vacío
}

// patientPatchRules es la lista blanca de columnas editables de forma parcial.
// id, tenant_id, created_at y updated_at nunca son modificables por el cliente.
var patientPatchRules = map[string]patchFieldRule{
	"rut_or_dni":              {kind: patchText, maxLen: 50, nullable: true},
	"full_name":               {kind: patchText, maxLen: 255},
	"email":                   {kind: patchText, maxLen: 255, nullable: true},
	"phone":                   {kind: patchText, maxLen: 50, nullable: true},
	"birth_date":              {kind: patchDate, nullable: true},
	"height_cm":               {kind: patchHeight, nullable: true},
	"gender":                  {kind: patchText, maxLen: 20, nullable: true},
	"blood_type":              {kind: patchText, maxLen: 10, nullable: true},
	"medical_conditions":      {kind: patchText, maxLen: 2000, nullable: true},
	"allergies":               {kind: patchText, maxLen: 2000, nullable: true},
	"emergency_contact_name":  {kind: patchText, maxLen: 255, nullable: true},
	"emergency_contact_phone": {kind: patchText, maxLen: 50, nullable: true},
}

// PatientPatch es una actualización parcial ya validada de un paciente: solo
// contiene columnas de la lista blanca con valores del tipo correcto. Un valor
// nil limpia la columna (NULL). Solo se construye con NewPatientPatch.
type PatientPatch struct {
	fields map[string]any
}

// NewPatientPatch valida los campos recibidos y construye el parche.
// Rechaza campos desconocidos, tipos incorrectos, valores fuera de rango y
// parches vacíos.
func NewPatientPatch(raw map[string]any) (PatientPatch, error) {
	if len(raw) == 0 {
		return PatientPatch{}, fmt.Errorf("%w: no fields provided", ErrInvalidPatientPatch)
	}

	fields := make(map[string]any, len(raw))
	for name, value := range raw {
		rule, ok := patientPatchRules[name]
		if !ok {
			return PatientPatch{}, fmt.Errorf("%w: field %q is not editable", ErrInvalidPatientPatch, name)
		}
		clean, err := rule.normalize(name, value)
		if err != nil {
			return PatientPatch{}, err
		}
		fields[name] = clean
	}
	return PatientPatch{fields: fields}, nil
}

func (r patchFieldRule) normalize(name string, value any) (any, error) {
	if value == nil {
		if !r.nullable {
			return nil, fmt.Errorf("%w: %s cannot be null", ErrInvalidPatientPatch, name)
		}
		return nil, nil
	}

	switch r.kind {
	case patchHeight:
		height, ok := value.(float64)
		if !ok || math.IsNaN(height) || math.IsInf(height, 0) {
			return nil, fmt.Errorf("%w: %s must be a number", ErrInvalidPatientPatch, name)
		}
		if height <= 0 || height > MaxPatientHeightCm {
			return nil, fmt.Errorf("%w: %s must be greater than 0 and at most %d", ErrInvalidPatientPatch, name, MaxPatientHeightCm)
		}
		return height, nil

	case patchDate:
		text, ok := value.(string)
		if !ok {
			return nil, fmt.Errorf("%w: %s must be a YYYY-MM-DD string", ErrInvalidPatientPatch, name)
		}
		text = strings.TrimSpace(text)
		if text == "" {
			return nil, nil
		}
		date, err := time.Parse("2006-01-02", text)
		if err != nil {
			return nil, fmt.Errorf("%w: %s must be a YYYY-MM-DD string", ErrInvalidPatientPatch, name)
		}
		if date.After(time.Now()) {
			return nil, fmt.Errorf("%w: %s cannot be in the future", ErrInvalidPatientPatch, name)
		}
		return text, nil

	default:
		text, ok := value.(string)
		if !ok {
			return nil, fmt.Errorf("%w: %s must be a string", ErrInvalidPatientPatch, name)
		}
		text = strings.TrimSpace(text)
		if text == "" {
			if !r.nullable {
				return nil, fmt.Errorf("%w: %s cannot be empty", ErrInvalidPatientPatch, name)
			}
			return nil, nil
		}
		if utf8.RuneCountInString(text) > r.maxLen {
			return nil, fmt.Errorf("%w: %s exceeds %d characters", ErrInvalidPatientPatch, name, r.maxLen)
		}
		return text, nil
	}
}

// Columns devuelve los nombres de columna del parche en orden alfabético
// (determinista), todos pertenecientes a la lista blanca.
func (p PatientPatch) Columns() []string {
	columns := make([]string, 0, len(p.fields))
	for name := range p.fields {
		columns = append(columns, name)
	}
	sort.Strings(columns)
	return columns
}

// Value devuelve el valor normalizado de una columna (nil = NULL).
func (p PatientPatch) Value(column string) any {
	return p.fields[column]
}
