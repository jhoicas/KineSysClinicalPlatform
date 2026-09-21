package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type DietPlannerHandler struct {
	service ports.DietPlannerService
}

func NewDietPlannerHandler(s ports.DietPlannerService) *DietPlannerHandler {
	return &DietPlannerHandler{service: s}
}

type CalculateDietPlanRequest struct {
	Items []domain.DietItemWithFood `json:"items"`
}

func (h *DietPlannerHandler) CalculateDietPlan(w http.ResponseWriter, r *http.Request) {
	// Tenant validation inside auth middleware protects this endpoint.
	// We can extract tenantID if needed, but the planner logic is purely mathematical.
	// tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)

	var req CalculateDietPlanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	result, err := h.service.CalculateDietPlanTotals(req.Items)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
