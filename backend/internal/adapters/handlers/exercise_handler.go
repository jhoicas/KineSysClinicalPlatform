package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
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
	userID, tenantID, ok := requestIdentity(r)
	if !ok {
		http.Error(w, "invalid user context", http.StatusUnauthorized)
		return
	}
	exercises, err := h.service.List(r.Context(), userID, tenantID, r.URL.Query().Get("search"), r.URL.Query().Get("category"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(exercises)
}

func (h *ExerciseHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, tenantID, ok := requestIdentity(r)
	if !ok {
		http.Error(w, "invalid user context", http.StatusUnauthorized)
		return
	}

	var exercise domain.Exercise
	if err := json.NewDecoder(r.Body).Decode(&exercise); err != nil {
		http.Error(w, "invalid exercise payload", http.StatusBadRequest)
		return
	}
	if exercise.Name == "" || exercise.Category == "" {
		http.Error(w, "name and category are required", http.StatusBadRequest)
		return
	}
	exercise.ID = uuid.New()
	exercise.UserID = &userID
	exercise.TenantID = tenantID
	exercise.IsSystem = false
	exercise.AuthorAttribution = ""
	if err := h.service.Create(r.Context(), &exercise); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(exercise)
}

func requestIdentity(r *http.Request) (uuid.UUID, uuid.UUID, bool) {
	userID, userOK := r.Context().Value(middleware.UserIDKey).(string)
	tenantID, tenantOK := r.Context().Value(middleware.TenantIDKey).(string)
	parsedUser, userErr := uuid.Parse(userID)
	parsedTenant, tenantErr := uuid.Parse(tenantID)
	return parsedUser, parsedTenant, userOK && tenantOK && userErr == nil && tenantErr == nil
}
