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

type AnthropometryHandler struct {
	service ports.AnthropometryService
}

func NewAnthropometryHandler(s ports.AnthropometryService) *AnthropometryHandler {
	return &AnthropometryHandler{service: s}
}

func (h *AnthropometryHandler) ListByPatient(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	tenantID, _ := uuid.Parse(tenantIDStr)
	
	patientIDStr := chi.URLParam(r, "patientId")
	patientID, err := uuid.Parse(patientIDStr)
	if err != nil {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	evals, err := h.service.ListEvaluations(r.Context(), patientID, tenantID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(evals)
}

func (h *AnthropometryHandler) Create(w http.ResponseWriter, r *http.Request) {
	tenantIDStr, _ := r.Context().Value(middleware.TenantIDKey).(string)
	userIDStr, _ := r.Context().Value(middleware.UserIDKey).(string)
	tenantID, _ := uuid.Parse(tenantIDStr)
	userID, _ := uuid.Parse(userIDStr)

	var ev domain.AnthropometricEvaluation
	if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	ev.TenantID = tenantID
	ev.ProfessionalID = userID

	if err := h.service.CreateEvaluation(r.Context(), &ev); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ev)
}

// DTOs for Calculations
type SomatotypeRequest struct {
	TricepsMm        float64 `json:"triceps_mm"`
	SubscapularMm    float64 `json:"subscapular_mm"`
	SuprailiacMm     float64 `json:"suprailiac_mm"`
	MedialCalfMm     float64 `json:"medial_calf_mm"`
	HumerusBreadthCm float64 `json:"humerus_breadth_cm"`
	FemurBreadthCm   float64 `json:"femur_breadth_cm"`
	FlexedArmCm      float64 `json:"flexed_arm_cm"`
	CalfCm           float64 `json:"calf_cm"`
	HeightCm         float64 `json:"height_cm"`
	WeightKg         float64 `json:"weight_kg"`
}

type BmrRequest struct {
	WeightKg float64 `json:"weight_kg"`
	HeightCm float64 `json:"height_cm"`
	AgeYears int     `json:"age_years"`
	Sex      string  `json:"sex"`
}

type CompositionRequest struct {
	Method   string   `json:"method"` // "jp7", "jp3", "faulkner"
	Sex      string   `json:"sex"`    // "male", "female"
	AgeYears int      `json:"age_years"`
	WeightKg *float64 `json:"weight_kg,omitempty"`
	Folds    struct {
		Chest       float64 `json:"chest"`
		Midaxillary float64 `json:"midaxillary"`
		Triceps     float64 `json:"triceps"`
		Subscapular float64 `json:"subscapular"`
		Abdomen     float64 `json:"abdomen"`
		Suprailiac  float64 `json:"suprailiac"`
		Thigh       float64 `json:"thigh"`
	} `json:"folds"`
}

func (h *AnthropometryHandler) CalculateSomatotype(w http.ResponseWriter, r *http.Request) {
	var req SomatotypeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	inputs := domain.HeathCarterInputs{
		TricepsMm:        req.TricepsMm,
		SubscapularMm:    req.SubscapularMm,
		SuprailiacMm:     req.SuprailiacMm,
		MedialCalfMm:     req.MedialCalfMm,
		HumerusBreadthCm: req.HumerusBreadthCm,
		FemurBreadthCm:   req.FemurBreadthCm,
		FlexedArmCm:      req.FlexedArmCm,
		CalfCm:           req.CalfCm,
		HeightCm:         req.HeightCm,
		WeightKg:         req.WeightKg,
	}

	result, err := h.service.CalculateHeathCarterSomatotype(inputs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *AnthropometryHandler) CalculateBMR(w http.ResponseWriter, r *http.Request) {
	var req BmrRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	inputs := domain.BmrInputs{
		WeightKg: req.WeightKg,
		HeightCm: req.HeightCm,
		AgeYears: req.AgeYears,
		Sex:      domain.BiologicalSex(req.Sex),
	}

	// For now, return Mifflin-St Jeor as default. Could expand to accept formula type.
	result, err := h.service.CalculateMifflinStJeor(inputs)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *AnthropometryHandler) CalculateComposition(w http.ResponseWriter, r *http.Request) {
	var req CompositionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var result domain.BodyCompositionResult
	var err error

	switch req.Method {
	case "jp7":
		folds := domain.JacksonPollock7Skinfolds{
			Chest:       req.Folds.Chest,
			Midaxillary: req.Folds.Midaxillary,
			Triceps:     req.Folds.Triceps,
			Subscapular: req.Folds.Subscapular,
			Abdomen:     req.Folds.Abdomen,
			Suprailiac:  req.Folds.Suprailiac,
			Thigh:       req.Folds.Thigh,
		}
		result, err = h.service.CalculateJacksonPollock7(domain.BiologicalSex(req.Sex), req.AgeYears, folds, req.WeightKg)
	case "jp3":
		if domain.BiologicalSex(req.Sex) == domain.SexMale {
			folds := domain.JacksonPollock3SkinfoldsMale{
				Chest:   req.Folds.Chest,
				Abdomen: req.Folds.Abdomen,
				Thigh:   req.Folds.Thigh,
			}
			result, err = h.service.CalculateJacksonPollock3Male(req.AgeYears, folds, req.WeightKg)
		} else {
			folds := domain.JacksonPollock3SkinfoldsFemale{
				Triceps:    req.Folds.Triceps,
				Suprailiac: req.Folds.Suprailiac,
				Thigh:      req.Folds.Thigh,
			}
			result, err = h.service.CalculateJacksonPollock3Female(req.AgeYears, folds, req.WeightKg)
		}
	case "faulkner":
		folds := domain.Faulkner4Skinfolds{
			Triceps:     req.Folds.Triceps,
			Subscapular: req.Folds.Subscapular,
			Suprailiac:  req.Folds.Suprailiac,
			Abdomen:     req.Folds.Abdomen,
		}
		result, err = h.service.CalculateFaulkner4(folds, req.WeightKg)
	default:
		http.Error(w, "invalid method, use jp7, jp3, or faulkner", http.StatusBadRequest)
		return
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}
