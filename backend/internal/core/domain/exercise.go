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
	TenantID          uuid.UUID  `json:"tenant_id"`
	TargetMuscle      string     `json:"target_muscle,omitempty"`
	Difficulty        string     `json:"difficulty,omitempty"`
}
