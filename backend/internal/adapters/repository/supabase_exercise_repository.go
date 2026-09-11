package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type SupabaseExerciseRepository struct {
	baseURL string
	key     string
	client  *http.Client
}

func NewSupabaseExerciseRepository(supabaseURL, serviceRoleKey string) ports.ExerciseRepository {
	return &SupabaseExerciseRepository{
		baseURL: strings.TrimRight(supabaseURL, "/") + "/rest/v1/exercise_library",
		key:     serviceRoleKey,
		client:  http.DefaultClient,
	}
}

func (r *SupabaseExerciseRepository) List(ctx context.Context, userID, tenantID uuid.UUID, search, category string) ([]domain.Exercise, error) {
	query := url.Values{
		"select": {"*"},
		"or":     {"(is_system.eq.true,and(is_system.eq.false,tenant_id.eq." + tenantID.String() + ",user_id.eq." + userID.String() + "))"},
		"order":  {"name.asc"},
	}
	if category != "" {
		query.Set("category", "eq."+category)
	}
	if search != "" {
		query.Set("name", "ilike.*"+search+"*")
	}

	var rows []exerciseLibraryRow
	if err := r.doJSON(ctx, http.MethodGet, "?"+query.Encode(), nil, &rows); err != nil {
		return nil, err
	}
	exercises := make([]domain.Exercise, 0, len(rows))
	for _, row := range rows {
		exercises = append(exercises, row.toDomain())
	}
	return exercises, nil
}

func (r *SupabaseExerciseRepository) Create(ctx context.Context, exercise *domain.Exercise) error {
	payload := exerciseLibraryRow{
		ID:          exercise.ID,
		TenantID:    exercise.TenantID,
		UserID:      exercise.UserID,
		IsSystem:    exercise.IsSystem,
		Name:        exercise.Name,
		Category:    exercise.Category,
		Target:      exercise.TargetMuscle,
		Difficulty:  exercise.Difficulty,
		Description: exercise.Description,
		ImageURL:    exercise.MediaURL,
	}
	return r.doJSON(ctx, http.MethodPost, "", payload, nil)
}

type exerciseLibraryRow struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	UserID      *uuid.UUID `json:"user_id,omitempty"`
	IsSystem    bool       `json:"is_system"`
	Name        string     `json:"name"`
	Category    string     `json:"category"`
	Target      string     `json:"target"`
	Difficulty  string     `json:"difficulty"`
	Description string     `json:"description"`
	ImageURL    string     `json:"image_url"`
}

func (row exerciseLibraryRow) toDomain() domain.Exercise {
	return domain.Exercise{
		ID:           row.ID,
		TenantID:     row.TenantID,
		UserID:       row.UserID,
		IsSystem:     row.IsSystem,
		Name:         row.Name,
		Category:     row.Category,
		TargetMuscle: row.Target,
		Difficulty:   row.Difficulty,
		Description:  row.Description,
		MediaURL:     row.ImageURL,
	}
}
func (r *SupabaseExerciseRepository) doJSON(ctx context.Context, method, suffix string, body any, result any) error {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}
	request, err := http.NewRequestWithContext(ctx, method, r.baseURL+suffix, reader)
	if err != nil {
		return err
	}
	request.Header.Set("apikey", r.key)
	request.Header.Set("Authorization", "Bearer "+r.key)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Prefer", "resolution=merge-duplicates,return=representation")

	response, err := r.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		message, _ := io.ReadAll(response.Body)
		return fmt.Errorf("supabase exercises request failed (%d): %s", response.StatusCode, string(message))
	}
	if result != nil {
		return json.NewDecoder(response.Body).Decode(result)
	}
	return nil
}
