package domain

import (
	"time"

	"github.com/google/uuid"
)

type SubscriptionPlan string

const (
	PlanFree     SubscriptionPlan = "free"
	PlanStarter  SubscriptionPlan = "starter"
	PlanPro      SubscriptionPlan = "pro"
	PlanClinical SubscriptionPlan = "clinical"
)

type SubscriptionStatus string

const (
	StatusActive    SubscriptionStatus = "active"
	StatusTrialing  SubscriptionStatus = "trialing"
	StatusPastDue   SubscriptionStatus = "past_due"
	StatusCanceled  SubscriptionStatus = "canceled"
)

type Tenant struct {
	ID                 uuid.UUID          `json:"id"`
	Name               string             `json:"name"`
	Subdomain          *string            `json:"subdomain,omitempty"`
	SubscriptionPlan   SubscriptionPlan   `json:"subscription_plan"`
	SubscriptionStatus SubscriptionStatus `json:"subscription_status"`
	CreatedAt          time.Time          `json:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at"`
}
