package handlers

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
	"github.com/kinesys/clinical-platform-backend/internal/middleware"
)

type ExerciseHandler struct {
	service ports.ExerciseService
}

func NewExerciseHandler(service ports.ExerciseService) *ExerciseHandler {
	return &ExerciseHandler{service: service}
}

func (h *ExerciseHandler) List(w http.ResponseWriter, r *http.Request) {
	exercises, err := h.service.List(r.Context(), r.URL.Query().Get("search"), r.URL.Query().Get("category"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exercises)
}

func (h *ExerciseHandler) Sync(w http.ResponseWriter, r *http.Request) {
	role, _ := r.Context().Value(middleware.RoleKey).(string)
	role = strings.ToLower(role)
	if role != "clinic_admin" && role != "super_admin" && role != "superadmin" {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	count, err := h.service.Sync(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"synced": count})
}
