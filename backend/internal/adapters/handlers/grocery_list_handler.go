package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type GroceryListHandler struct {
	service ports.GroceryListService
}

func NewGroceryListHandler(s ports.GroceryListService) *GroceryListHandler {
	return &GroceryListHandler{service: s}
}

type GenerateGroceryListRequest struct {
	PlanItems []domain.GroceryPlanItem `json:"plan_items"`
	Days      int                      `json:"days"`
}

func (h *GroceryListHandler) GenerateGroceryList(w http.ResponseWriter, r *http.Request) {
	// The route is protected by the Supabase JWT middleware.
	// tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)

	var req GenerateGroceryListRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	days := req.Days
	if days <= 0 {
		days = 7 // default as in TS
	}

	result, err := h.service.GenerateSmartGroceryList(req.PlanItems, days)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
