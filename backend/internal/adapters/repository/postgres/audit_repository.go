package postgres

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
)

type auditRepository struct {
	db *pgxpool.Pool
}

func NewAuditRepository(db *pgxpool.Pool) ports.AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) Create(ctx context.Context, log *domain.ClinicalAuditLog) error {
	query := `INSERT INTO clinical_audit_logs (tenant_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at`
	
	return r.db.QueryRow(ctx, query, 
		log.TenantID, log.UserID, log.Action, log.EntityType, log.EntityID,
		log.OldData, log.NewData, log.IPAddress,
	).Scan(&log.ID, &log.CreatedAt)
}
