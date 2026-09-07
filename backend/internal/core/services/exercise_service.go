package services

import (
	"context"
	"html"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type ExerciseCatalogSource interface {
	FetchWger(ctx context.Context) ([]domain.WgerExercise, error)
	FetchExerciseDB(ctx context.Context) ([]domain.ExerciseDBExercise, error)
}

type exerciseService struct {
	repo   ports.ExerciseRepository
	source ExerciseCatalogSource
}

func NewExerciseService(repo ports.ExerciseRepository, source ExerciseCatalogSource) ports.ExerciseService {
	return &exerciseService{repo: repo, source: source}
}

func (s *exerciseService) List(ctx context.Context, search, category string) ([]domain.Exercise, error) {
	return s.repo.ListSystem(ctx, search, category)
}

func (s *exerciseService) Sync(ctx context.Context) (int, error) {
	wger, err := s.source.FetchWger(ctx)
	if err != nil {
		return 0, err
	}
	edb, err := s.source.FetchExerciseDB(ctx)
	if err != nil {
		return 0, err
	}

	exercises := transformExercises(wger, edb)
	if err := s.repo.UpsertSystem(ctx, exercises); err != nil {
		return 0, err
	}
	return len(exercises), nil
}

var htmlTagPattern = regexp.MustCompile(`<[^>]*>`)

func sanitizeDescription(value string) string {
	text := htmlTagPattern.ReplaceAllString(value, " ")
	text = html.UnescapeString(text)
	return strings.Join(strings.Fields(text), " ")
}

func normalize(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	return strings.NewReplacer(
		"á", "a", "é", "e", "í", "i", "ó", "o", "ú", "u", "ü", "u", "ñ", "n",
	).Replace(value)
}

func transformExercises(wger []domain.WgerExercise, edb []domain.ExerciseDBExercise) []domain.Exercise {
	wgerByMuscle := make(map[string]domain.WgerExercise)
	for _, item := range wger {
		for _, muscle := range item.Muscles {
			if key := normalize(muscle.Name); key != "" {
				wgerByMuscle[key] = item
			}
		}
	}

	result := make([]domain.Exercise, 0, len(edb))
	for _, item := range edb {
		category := normalize(item.Category)
		if category != "stretching" && category != "mobility" && item.MET > 5 {
			continue
		}
		matched := wgerByMuscle[normalize(item.Target)]
		id := uuid.New()
		result = append(result, domain.Exercise{
			ID:                id,
			Name:              item.Name,
			Description:       sanitizeDescription(matched.Description),
			Category:          category,
			MediaURL:          item.GIFURL,
			IsSystem:          true,
			AuthorAttribution: "Descripción: Wger (CC BY-SA 4.0). GIF: ExerciseDB.",
			TargetMuscle:      item.Target,
			Difficulty:        item.Equipment,
		})
	}
	return result
}
