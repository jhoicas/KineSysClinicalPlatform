package domain

import (
	"time"

	"github.com/google/uuid"
)

type ClinicalAuditLog struct {
	ID         uuid.UUID      `json:"id"`
	TenantID   uuid.UUID      `json:"tenant_id"`
	UserID     uuid.UUID      `json:"user_id"`
	Action     string         `json:"action"`
	EntityType string         `json:"entity_type"`
	EntityID   uuid.UUID      `json:"entity_id"`
	OldData    map[string]any `json:"old_data,omitempty"`
	NewData    map[string]any `json:"new_data,omitempty"`
	IPAddress  *string        `json:"ip_address,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
}
