package domain

import (
	"time"

	"github.com/google/uuid"
)

type Role string

const (
	RoleSuperAdmin Role = "super_admin"
	RoleTenantAdmin Role = "tenant_admin"
	RoleProfessional Role = "professional"
	RoleAssistant    Role = "assistant"
)

type User struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenant_id"`
	Email     string     `json:"email"`
	FullName  string     `json:"full_name"`
	Role      Role       `json:"role"`
	AvatarURL *string    `json:"avatar_url,omitempty"`
	IsActive  bool       `json:"is_active"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}
