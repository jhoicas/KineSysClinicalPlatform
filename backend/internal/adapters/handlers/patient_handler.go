package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
	"github.com/kinesys/clinical-platform-backend/internal/middleware"
)

type PatientHandler struct {
	service ports.PatientService
}

func NewPatientHandler(s ports.PatientService) *PatientHandler {
	return &PatientHandler{service: s}
}

func (h *PatientHandler) List(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		http.Error(w, "Invalid tenant context", http.StatusUnauthorized)
		return
	}

	patients, err := h.service.ListPatients(r.Context(), tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patients)
}

func (h *PatientHandler) Get(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	tenantID, _ := uuid.Parse(tenantIDStr)
	
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	patient, err := h.service.GetPatient(r.Context(), id, tenantID)
	if err != nil {
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient)
}

func (h *PatientHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	tenantID, _ := uuid.Parse(tenantIDStr)

	var p domain.Patient
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	p.TenantID = tenantID

	if err := h.service.CreatePatient(r.Context(), &p); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(p)
}

// maxPatchBodyBytes limita el cuerpo de un PATCH; un autoguardado envía pocos campos.
const maxPatchBodyBytes = 64 << 10

// Patch aplica una actualización parcial (PATCH /api/v1/patients/{id}). Solo se
// modifican los campos presentes en el cuerpo; un valor null limpia la columna.
func (h *PatientHandler) Patch(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	tenantID, err := uuid.Parse(tenantIDStr)
	if err != nil {
		http.Error(w, "Invalid tenant context", http.StatusUnauthorized)
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	var fields map[string]any
	r.Body = http.MaxBytesReader(w, r.Body, maxPatchBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(&fields); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	patient, err := h.service.PatchPatient(r.Context(), id, tenantID, fields)
	switch {
	case errors.Is(err, domain.ErrInvalidPatientPatch):
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	case errors.Is(err, domain.ErrPatientNotFound):
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	case err != nil:
		log.Printf("patient patch failed (patient=%s tenant=%s): %v", id, tenantID, err)
		http.Error(w, "Could not update patient", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(patient)
}
