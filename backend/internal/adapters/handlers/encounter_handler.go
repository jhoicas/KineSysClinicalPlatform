package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
	"github.com/kinesys/clinical-platform-backend/internal/middleware"
)

type EncounterHandler struct {
	service ports.EncounterService
}

func NewEncounterHandler(s ports.EncounterService) *EncounterHandler {
	return &EncounterHandler{service: s}
}

func (h *EncounterHandler) ListByPatient(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	tenantID, _ := uuid.Parse(tenantIDStr)
	
	patientIDStr := chi.URLParam(r, "patientId")
	patientID, err := uuid.Parse(patientIDStr)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	encounters, err := h.service.ListEncounters(r.Context(), patientID, tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(encounters)
}

func (h *EncounterHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	userIDStr, _ := r.Context().Value(middleware.UserIDKey).(string)
	tenantID, _ := uuid.Parse(tenantIDStr)
	userID, _ := uuid.Parse(userIDStr)

	var e domain.MedicalEncounter
	if err := json.NewDecoder(r.Body).Decode(&e); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	e.TenantID = tenantID
	e.ProfessionalID = userID

	if err := h.service.CreateEncounter(r.Context(), &e); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(e)
}
