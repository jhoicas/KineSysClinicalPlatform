package domain

import (
	"time"

	"github.com/google/uuid"
)

type WithingsIntegration struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	NutritionistID uuid.UUID `json:"nutritionist_id"`
	WithingsUserID string    `json:"withings_user_id"`
	ClientID       string    `json:"client_id,omitempty"`
	ClientSecret   string    `json:"client_secret,omitempty"`
	RedirectURI    string    `json:"redirect_uri,omitempty"`
	AccessToken    string    `json:"access_token"`
	RefreshToken   string    `json:"refresh_token"`
	ExpiresAt      time.Time `json:"expires_at"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
