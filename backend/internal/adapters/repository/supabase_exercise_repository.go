package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

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
		baseURL: supabaseURL + "/rest/v1/exercises",
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

	var exercises []domain.Exercise
	if err := r.doJSON(ctx, http.MethodGet, "?"+query.Encode(), nil, &exercises); err != nil {
		return nil, err
	}
	return exercises, nil
}

func (r *SupabaseExerciseRepository) Create(ctx context.Context, exercise *domain.Exercise) error {
	return r.doJSON(ctx, http.MethodPost, "", exercise, nil)
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
