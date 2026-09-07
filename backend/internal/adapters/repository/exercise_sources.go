package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/services"
)

type ExerciseAPISource struct {
	wgerURL       string
	exerciseDBURL string
	exerciseDBKey string
	client        *http.Client
}

var _ services.ExerciseCatalogSource = (*ExerciseAPISource)(nil)

func NewExerciseAPISource(wgerURL, exerciseDBURL, exerciseDBKey string) services.ExerciseCatalogSource {
	return &ExerciseAPISource{
		wgerURL:       wgerURL,
		exerciseDBURL: exerciseDBURL,
		exerciseDBKey: exerciseDBKey,
		client:        http.DefaultClient,
	}
}

func (s *ExerciseAPISource) FetchWger(ctx context.Context) ([]domain.WgerExercise, error) {
	endpoint, err := url.Parse(s.wgerURL)
	if err != nil {
		return nil, err
	}
	params := endpoint.Query()
	params.Set("language", "7")
	params.Set("limit", "200")
	endpoint.RawQuery = params.Encode()

	var response struct {
		Results []domain.WgerExercise `json:"results"`
	}
	if err := s.getJSON(ctx, endpoint.String(), "", &response); err != nil {
		return nil, err
	}
	return response.Results, nil
}

func (s *ExerciseAPISource) FetchExerciseDB(ctx context.Context) ([]domain.ExerciseDBExercise, error) {
	var response []domain.ExerciseDBExercise
	if err := s.getJSON(ctx, s.exerciseDBURL, s.exerciseDBKey, &response); err != nil {
		return nil, err
	}
	return response, nil
}

func (s *ExerciseAPISource) getJSON(ctx context.Context, endpoint, apiKey string, result any) error {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	if apiKey != "" {
		request.Header.Set("X-RapidAPI-Key", apiKey)
		if parsed, parseErr := url.Parse(endpoint); parseErr == nil && strings.Contains(parsed.Host, "rapidapi") {
			request.Header.Set("X-RapidAPI-Host", parsed.Host)
		}
	}
	response, err := s.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("exercise source request failed (%d)", response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(result)
}
