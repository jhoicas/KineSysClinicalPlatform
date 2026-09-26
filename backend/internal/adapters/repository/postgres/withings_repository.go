package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type withingsRepository struct {
	db *pgxpool.Pool
}

func NewWithingsRepository(db *pgxpool.Pool) ports.WithingsRepository {
	return &withingsRepository{db: db}
}

func (r *withingsRepository) FindByWithingsUserID(ctx context.Context, withingsUserID string) (*domain.WithingsIntegration, error) {
	query := `
		SELECT id, tenant_id, nutritionist_id, withings_user_id, COALESCE(client_id, ''), COALESCE(client_secret, ''),
		       access_token, refresh_token, expires_at, is_active, created_at, updated_at
		FROM kinesys.withings_integrations
		WHERE withings_user_id = $1 AND is_active = TRUE
		LIMIT 1
	`
	var item domain.WithingsIntegration
	err := r.db.QueryRow(ctx, query, withingsUserID).Scan(
		&item.ID, &item.TenantID, &item.NutritionistID, &item.WithingsUserID,
		&item.ClientID, &item.ClientSecret, &item.AccessToken, &item.RefreshToken,
		&item.ExpiresAt, &item.IsActive, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *withingsRepository) FindByNutritionist(ctx context.Context, tenantID, nutritionistID uuid.UUID) (*domain.WithingsIntegration, error) {
	query := `
		SELECT id, tenant_id, nutritionist_id, withings_user_id, COALESCE(client_id, ''), COALESCE(client_secret, ''),
		       access_token, refresh_token, expires_at, is_active, created_at, updated_at
		FROM kinesys.withings_integrations
		WHERE tenant_id = $1 AND nutritionist_id = $2 AND is_active = TRUE
		ORDER BY updated_at DESC LIMIT 1
	`
	var item domain.WithingsIntegration
	err := r.db.QueryRow(ctx, query, tenantID, nutritionistID).Scan(
		&item.ID, &item.TenantID, &item.NutritionistID, &item.WithingsUserID,
		&item.ClientID, &item.ClientSecret, &item.AccessToken, &item.RefreshToken,
		&item.ExpiresAt, &item.IsActive, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *withingsRepository) Upsert(ctx context.Context, integration *domain.WithingsIntegration) error {
	query := `
		INSERT INTO kinesys.withings_integrations (
			tenant_id, nutritionist_id, withings_user_id, client_id, client_secret,
			access_token, refresh_token, expires_at, is_active, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
		)
		ON CONFLICT (withings_user_id) DO UPDATE SET
			tenant_id = EXCLUDED.tenant_id,
			nutritionist_id = EXCLUDED.nutritionist_id,
			client_id = COALESCE(NULLIF(EXCLUDED.client_id, ''), kinesys.withings_integrations.client_id),
			client_secret = COALESCE(NULLIF(EXCLUDED.client_secret, ''), kinesys.withings_integrations.client_secret),
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			expires_at = EXCLUDED.expires_at,
			is_active = EXCLUDED.is_active,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		integration.TenantID, integration.NutritionistID, integration.WithingsUserID,
		integration.ClientID, integration.ClientSecret, integration.AccessToken,
		integration.RefreshToken, integration.ExpiresAt, integration.IsActive,
	).Scan(&integration.ID, &integration.CreatedAt, &integration.UpdatedAt)
}

func (r *withingsRepository) UpdateTokens(ctx context.Context, withingsUserID, accessToken, refreshToken string, expiresAt time.Time) error {
	query := `
		UPDATE kinesys.withings_integrations
		SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
		WHERE withings_user_id = $4
	`
	_, err := r.db.Exec(ctx, query, accessToken, refreshToken, expiresAt, withingsUserID)
	return err
}
