package domain

import "github.com/google/uuid"

type Exercise struct {
	ID                uuid.UUID  `json:"id"`
	Name              string     `json:"name"`
	Description       string     `json:"description"`
	Category          string     `json:"category"`
	MediaURL          string     `json:"media_url"`
	IsSystem          bool       `json:"is_system"`
	AuthorAttribution string     `json:"author_attribution"`
	UserID            *uuid.UUID `json:"user_id,omitempty"`
	TargetMuscle      string     `json:"target_muscle,omitempty"`
	Difficulty        string     `json:"difficulty,omitempty"`
}

type WgerExercise struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Muscles     []struct {
		Name string `json:"name"`
	} `json:"muscles"`
}

type ExerciseDBExercise struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	GIFURL    string   `json:"gifUrl"`
	Target    string   `json:"target"`
	BodyPart  string   `json:"bodyPart"`
	Equipment string   `json:"equipment"`
	Category  string   `json:"category"`
	MET       float64  `json:"met"`
	Secondary []string `json:"secondaryMuscles"`
}
