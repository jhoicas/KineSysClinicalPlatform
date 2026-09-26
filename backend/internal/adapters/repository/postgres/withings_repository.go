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
		SELECT id, tenant_id, nutritionist_id, COALESCE(withings_user_id, ''), COALESCE(client_id, ''), COALESCE(client_secret, ''),
		       COALESCE(redirect_uri, ''), COALESCE(access_token, ''), COALESCE(refresh_token, ''), COALESCE(expires_at, NOW()), is_active, created_at, updated_at
		FROM kinesys.withings_integrations
		WHERE withings_user_id = $1 AND is_active = TRUE
		LIMIT 1
	`
	var item domain.WithingsIntegration
	err := r.db.QueryRow(ctx, query, withingsUserID).Scan(
		&item.ID, &item.TenantID, &item.NutritionistID, &item.WithingsUserID,
		&item.ClientID, &item.ClientSecret, &item.RedirectURI, &item.AccessToken, &item.RefreshToken,
		&item.ExpiresAt, &item.IsActive, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *withingsRepository) FindByNutritionist(ctx context.Context, tenantID, nutritionistID uuid.UUID) (*domain.WithingsIntegration, error) {
	query := `
		SELECT id, tenant_id, nutritionist_id, COALESCE(withings_user_id, ''), COALESCE(client_id, ''), COALESCE(client_secret, ''),
		       COALESCE(redirect_uri, ''), COALESCE(access_token, ''), COALESCE(refresh_token, ''), COALESCE(expires_at, NOW()), is_active, created_at, updated_at
		FROM kinesys.withings_integrations
		WHERE ((tenant_id = $1 AND nutritionist_id = $2) OR (nutritionist_id = $2)) AND is_active = TRUE
		ORDER BY updated_at DESC LIMIT 1
	`
	var item domain.WithingsIntegration
	err := r.db.QueryRow(ctx, query, tenantID, nutritionistID).Scan(
		&item.ID, &item.TenantID, &item.NutritionistID, &item.WithingsUserID,
		&item.ClientID, &item.ClientSecret, &item.RedirectURI, &item.AccessToken, &item.RefreshToken,
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
			tenant_id, nutritionist_id, withings_user_id, client_id, client_secret, redirect_uri,
			access_token, refresh_token, expires_at, is_active, updated_at
		) VALUES (
			$1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''),
			$7, $8, $9, $10, NOW()
		)
		ON CONFLICT (tenant_id, nutritionist_id) DO UPDATE SET
			withings_user_id = COALESCE(NULLIF(EXCLUDED.withings_user_id, ''), kinesys.withings_integrations.withings_user_id),
			client_id = COALESCE(NULLIF(EXCLUDED.client_id, ''), kinesys.withings_integrations.client_id),
			client_secret = COALESCE(NULLIF(EXCLUDED.client_secret, ''), kinesys.withings_integrations.client_secret),
			redirect_uri = COALESCE(NULLIF(EXCLUDED.redirect_uri, ''), kinesys.withings_integrations.redirect_uri),
			access_token = COALESCE(NULLIF(EXCLUDED.access_token, ''), kinesys.withings_integrations.access_token),
			refresh_token = COALESCE(NULLIF(EXCLUDED.refresh_token, ''), kinesys.withings_integrations.refresh_token),
			expires_at = COALESCE(EXCLUDED.expires_at, kinesys.withings_integrations.expires_at),
			is_active = EXCLUDED.is_active,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return r.db.QueryRow(ctx, query,
		integration.TenantID, integration.NutritionistID, integration.WithingsUserID,
		integration.ClientID, integration.ClientSecret, integration.RedirectURI,
		integration.AccessToken, integration.RefreshToken, integration.ExpiresAt, integration.IsActive,
	).Scan(&integration.ID, &integration.CreatedAt, &integration.UpdatedAt)
}

func (r *withingsRepository) UpsertCredentials(ctx context.Context, tenantID, nutritionistID uuid.UUID, clientID, clientSecret, redirectURI string) error {
	query := `
		INSERT INTO kinesys.withings_integrations (
			tenant_id, nutritionist_id, client_id, client_secret, redirect_uri,
			withings_user_id, access_token, refresh_token, expires_at, is_active, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			NULL, NULL, NULL, NULL, TRUE, NOW()
		)
		ON CONFLICT (tenant_id, nutritionist_id) DO UPDATE SET
			client_id = EXCLUDED.client_id,
			client_secret = EXCLUDED.client_secret,
			redirect_uri = EXCLUDED.redirect_uri,
			is_active = TRUE,
			updated_at = NOW()
	`
	_, err := r.db.Exec(ctx, query, tenantID, nutritionistID, clientID, clientSecret, redirectURI)
	return err
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

func (r *withingsRepository) UpdateTokensByNutritionist(ctx context.Context, tenantID, nutritionistID uuid.UUID, withingsUserID, accessToken, refreshToken string, expiresAt time.Time) error {
	query := `
		UPDATE kinesys.withings_integrations
		SET withings_user_id = $1, access_token = $2, refresh_token = $3, expires_at = $4, is_active = TRUE, updated_at = NOW()
		WHERE (tenant_id = $5 AND nutritionist_id = $6) OR nutritionist_id = $6
	`
	_, err := r.db.Exec(ctx, query, withingsUserID, accessToken, refreshToken, expiresAt, tenantID, nutritionistID)
	return err
}
