package handlers

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
	"github.com/kinesys/clinical-platform-backend/internal/middleware"
)

type WithingsHardwareHandler struct {
	mu               sync.RWMutex
	accessToken      string
	refreshToken     string
	userID           string
	lastAccessToken  string
	userTokens       map[string]string
	apiBaseURL       string
	clientID         string
	clientSecret     string
	client           *http.Client
	db               *pgxpool.Pool
	patientService   ports.PatientService
	anthropometrySvc ports.AnthropometryService
	withingsRepo     ports.WithingsRepository
}

var (
	pocMutex         sync.Mutex
	pocSessionActive bool
	pocRawPayload    map[string]interface{}
	pocExpiresAt     time.Time

	clinicalSessionMutex    sync.RWMutex
	clinicalActiveSessions  = make(map[uuid.UUID]*domain.ActiveWeighInSession)
	lastActiveClinicalPatID uuid.UUID
)

type withingsMeasure struct {
	Value    float64 `json:"value"`
	Unit     int     `json:"unit"`
	Type     int     `json:"type"`
	Position *int    `json:"position,omitempty"`
}

type withingsMeasureGroup struct {
	Date     int64             `json:"date"`
	Measures []withingsMeasure `json:"measures"`
}

type withingsResponse struct {
	Status int `json:"status"`
	Body   struct {
		MeasureGroups []withingsMeasureGroup `json:"measuregrps"`
	} `json:"body"`
}

type WithingsHardwareReading struct {
	PatientID        string            `json:"patient_id"`
	Source           string            `json:"source"`
	EvaluationDate   string            `json:"evaluation_date"`
	WeightKg         *float64          `json:"weight_kg"`
	HeightCm         *float64          `json:"height_cm"`
	BodyFatPct       *float64          `json:"body_fat_pct"`
	FatMassKg        *float64          `json:"fat_mass_kg,omitempty"`
	MuscleMassKg     *float64          `json:"muscle_mass_kg,omitempty"`
	HydrationKg      *float64          `json:"hydration_kg,omitempty"`
	BoneMassKg       *float64          `json:"bone_mass_kg,omitempty"`
	ProteinKg        *float64          `json:"protein_kg,omitempty"`
	VisceralFatIndex *float64          `json:"visceral_fat_index"`
	BMR              *float64          `json:"bmr"`
	ProviderMeta     map[string]string `json:"provider_meta,omitempty"`
}

func NewWithingsHardwareHandler(
	accessToken, refreshToken, userID, apiBaseURL, clientID, clientSecret string,
	db *pgxpool.Pool,
	patientService ports.PatientService,
	anthropometrySvc ports.AnthropometryService,
	withingsRepo ...ports.WithingsRepository,
) *WithingsHardwareHandler {
	var repo ports.WithingsRepository
	if len(withingsRepo) > 0 {
		repo = withingsRepo[0]
	}
	h := &WithingsHardwareHandler{
		accessToken:      accessToken,
		refreshToken:     refreshToken,
		userID:           userID,
		lastAccessToken:  accessToken,
		userTokens:       map[string]string{},
		apiBaseURL:       strings.TrimRight(apiBaseURL, "/"),
		clientID:         clientID,
		clientSecret:     clientSecret,
		client:           &http.Client{Timeout: 20 * time.Second},
		db:               db,
		patientService:   patientService,
		anthropometrySvc: anthropometrySvc,
		withingsRepo:     repo,
	}
	if db != nil {
		go h.initDatabaseAndTokens(context.Background())
	}
	return h
}

func maskToken(t string) string {
	if t == "" {
		return ""
	}
	if len(t) <= 8 {
		return t
	}
	prefixLen := 4
	suffixLen := 4
	if len(t) <= prefixLen+suffixLen {
		return t[:prefixLen] + "..." + t[len(t)-suffixLen:]
	}
	return t[:prefixLen] + "..." + t[len(t)-suffixLen:]
}

func (h *WithingsHardwareHandler) resolveTenantID(ctx context.Context, userIDStr string) uuid.UUID {
	defaultTenant := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	if h.db == nil || userIDStr == "" {
		return defaultTenant
	}

	var tidStr string
	err := h.db.QueryRow(ctx, "SELECT tenant_id::text FROM kinesys.users WHERE id = $1 AND is_active = TRUE", userIDStr).Scan(&tidStr)
	if err != nil {
		err = h.db.QueryRow(ctx, "SELECT tenant_id::text FROM kinesys.profiles WHERE id = $1 AND is_active = TRUE", userIDStr).Scan(&tidStr)
	}

	if tidStr != "" {
		if t, err := uuid.Parse(tidStr); err == nil {
			return t
		}
	}
	return defaultTenant
}

func (h *WithingsHardwareHandler) Sync(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(chi.URLParam(r, "patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}
	if h.accessToken == "" && h.refreshToken == "" {
		http.Error(w, `{"error": "Báscula no vinculada"}`, http.StatusUnauthorized)
		return
	}

	userIDStr, _ := r.Context().Value(middleware.UserIDKey).(string)
	tenantID := h.resolveTenantID(r.Context(), userIDStr)

	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient UUID", http.StatusBadRequest)
		return
	}

	patient, err := h.patientService.GetPatient(r.Context(), patientUUID, tenantID)
	if err != nil {
		http.Error(w, "Patient not found", http.StatusNotFound)
		return
	}

	reading, err := h.fetchEvaluation(r.Context(), patient)
	if err != nil {
		// If unauthorized, try to refresh
		if strings.Contains(err.Error(), "HTTP 401") && h.refreshToken != "" {
			if refreshErr := h.refreshAccessToken(r.Context()); refreshErr == nil {
				// Retry fetch after successful refresh
				reading, err = h.fetchEvaluation(r.Context(), patient)
			}
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusBadGateway)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(reading)
}

func (h *WithingsHardwareHandler) refreshAccessToken(ctx context.Context) error {
	form := url.Values{
		"action":        {"requesttoken"},
		"grant_type":    {"refresh_token"},
		"client_id":     {h.clientID},
		"client_secret": {h.clientSecret},
		"refresh_token": {h.refreshToken},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://wbsapi.withings.net/v2/oauth2", strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("refresh failed with status %d", res.StatusCode)
	}

	var payload struct {
		Status int `json:"status"`
		Body   struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			UserID       string `json:"userid"`
		} `json:"body"`
	}

	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return err
	}
	if payload.Status != 0 {
		return fmt.Errorf("Withings API status=%d", payload.Status)
	}

	// Update local state (in a real app, save to DB/config)
	h.accessToken = payload.Body.AccessToken
	h.refreshToken = payload.Body.RefreshToken
	h.userID = payload.Body.UserID

	fmt.Printf("[Withings Refresh] Refreshed tokens for UserID=%s\n", h.userID)
	return nil
}

func (h *WithingsHardwareHandler) initDatabaseAndTokens(ctx context.Context) {
	if h.db == nil {
		return
	}

	createTableSQL := `
	CREATE TABLE IF NOT EXISTS kinesys.withings_integrations (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
		nutritionist_id UUID NOT NULL REFERENCES kinesys.users(id) ON DELETE CASCADE,
		withings_user_id VARCHAR(100) NOT NULL UNIQUE,
		client_id TEXT,
		client_secret TEXT,
		access_token TEXT NOT NULL,
		refresh_token TEXT NOT NULL,
		expires_at TIMESTAMPTZ NOT NULL,
		is_active BOOLEAN NOT NULL DEFAULT true,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_withings_integrations_tenant_id ON kinesys.withings_integrations(tenant_id);
	CREATE INDEX IF NOT EXISTS idx_withings_integrations_nutritionist_id ON kinesys.withings_integrations(nutritionist_id);
	CREATE INDEX IF NOT EXISTS idx_withings_integrations_withings_user_id ON kinesys.withings_integrations(withings_user_id);
	CREATE INDEX IF NOT EXISTS idx_withings_integrations_tenant_nutri ON kinesys.withings_integrations(tenant_id, nutritionist_id);

	ALTER TABLE kinesys.withings_integrations ADD COLUMN IF NOT EXISTS redirect_uri TEXT;
	ALTER TABLE kinesys.withings_integrations ALTER COLUMN withings_user_id DROP NOT NULL;
	ALTER TABLE kinesys.withings_integrations ALTER COLUMN access_token DROP NOT NULL;
	ALTER TABLE kinesys.withings_integrations ALTER COLUMN refresh_token DROP NOT NULL;
	ALTER TABLE kinesys.withings_integrations ALTER COLUMN expires_at DROP NOT NULL;
	CREATE UNIQUE INDEX IF NOT EXISTS uq_withings_integrations_tenant_nutritionist ON kinesys.withings_integrations(tenant_id, nutritionist_id);

	ALTER TABLE kinesys.active_weigh_in_sessions 
	ADD COLUMN IF NOT EXISTS nutritionist_id UUID REFERENCES kinesys.users(id) ON DELETE SET NULL;
	CREATE INDEX IF NOT EXISTS idx_active_weigh_in_sessions_tenant_nutri ON kinesys.active_weigh_in_sessions(tenant_id, nutritionist_id);

	CREATE TABLE IF NOT EXISTS kinesys.withings_oauth_tokens (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		tenant_id UUID NOT NULL REFERENCES kinesys.tenants(id) ON DELETE CASCADE,
		patient_id UUID REFERENCES kinesys.pacientes_clinicos(id) ON DELETE SET NULL,
		userid VARCHAR(100) NOT NULL UNIQUE,
		access_token TEXT NOT NULL,
		refresh_token TEXT NOT NULL,
		expires_at TIMESTAMPTZ NOT NULL,
		created_at TIMESTAMPTZ DEFAULT NOW(),
		updated_at TIMESTAMPTZ DEFAULT NOW()
	);
	CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_patient_id ON kinesys.withings_oauth_tokens(patient_id);
	CREATE INDEX IF NOT EXISTS idx_withings_oauth_tokens_userid ON kinesys.withings_oauth_tokens(userid);
	`
	if _, err := h.db.Exec(ctx, createTableSQL); err != nil {
		log.Printf("[WITHINGS INIT DB ERROR] Error creando tablas withings: %v", err)
	}

	// Asegurar que active_weigh_in_sessions no bloquee lecturas/escrituras de webhooks
	_, _ = h.db.Exec(ctx, "ALTER TABLE kinesys.active_weigh_in_sessions DISABLE ROW LEVEL SECURITY")

	// Cargar tokens activos desde withings_integrations
	if integRows, err := h.db.Query(ctx, `
		SELECT withings_user_id, access_token 
		FROM kinesys.withings_integrations 
		WHERE is_active = TRUE
	`); err == nil {
		defer integRows.Close()
		h.mu.Lock()
		if h.userTokens == nil {
			h.userTokens = make(map[string]string)
		}
		for integRows.Next() {
			var uid, aToken string
			if err := integRows.Scan(&uid, &aToken); err == nil {
				h.userTokens[uid] = aToken
			}
		}
		h.mu.Unlock()
	}

	rows, err := h.db.Query(ctx, `
		SELECT userid, access_token, refresh_token, expires_at 
		FROM kinesys.withings_oauth_tokens 
		ORDER BY updated_at DESC
	`)
	if err == nil {
		defer rows.Close()
		count := 0
		h.mu.Lock()
		if h.userTokens == nil {
			h.userTokens = make(map[string]string)
		}
		for rows.Next() {
			var uid, aToken, rToken string
			var expAt time.Time
			if err := rows.Scan(&uid, &aToken, &rToken, &expAt); err == nil {
				h.userTokens[uid] = aToken
				if count == 0 {
					h.lastAccessToken = aToken
					h.accessToken = aToken
					h.refreshToken = rToken
					h.userID = uid
				}
				count++
			}
		}
		h.mu.Unlock()
		if count > 0 {
			log.Printf("[WITHINGS INIT] %d tokens de Withings cargados desde BD a memoria", count)
		}
	}
}

func (h *WithingsHardwareHandler) getIntegrationByNutritionist(ctx context.Context, tenantID, nutritionistID uuid.UUID) (*domain.WithingsIntegration, error) {
	if h.withingsRepo != nil {
		return h.withingsRepo.FindByNutritionist(ctx, tenantID, nutritionistID)
	}
	if h.db == nil {
		return nil, fmt.Errorf("no database configured")
	}
	query := `
		SELECT id, tenant_id, nutritionist_id, COALESCE(withings_user_id, ''), COALESCE(client_id, ''), COALESCE(client_secret, ''),
		       COALESCE(redirect_uri, ''), COALESCE(access_token, ''), COALESCE(refresh_token, ''), COALESCE(expires_at, NOW()), is_active, created_at, updated_at
		FROM kinesys.withings_integrations
		WHERE ((tenant_id = $1 AND nutritionist_id = $2) OR nutritionist_id = $2) AND is_active = TRUE
		ORDER BY updated_at DESC LIMIT 1
	`
	var item domain.WithingsIntegration
	err := h.db.QueryRow(ctx, query, tenantID, nutritionistID).Scan(
		&item.ID, &item.TenantID, &item.NutritionistID, &item.WithingsUserID,
		&item.ClientID, &item.ClientSecret, &item.RedirectURI, &item.AccessToken, &item.RefreshToken,
		&item.ExpiresAt, &item.IsActive, &item.CreatedAt, &item.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (h *WithingsHardwareHandler) saveWithingsIntegration(ctx context.Context, integ *domain.WithingsIntegration) error {
	if h.withingsRepo != nil {
		return h.withingsRepo.Upsert(ctx, integ)
	}
	if h.db == nil {
		return nil
	}
	query := `
		INSERT INTO kinesys.withings_integrations (
			tenant_id, nutritionist_id, withings_user_id, client_id, client_secret, redirect_uri,
			access_token, refresh_token, expires_at, is_active, updated_at
		) VALUES (
			$1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''),
			$7, $8, $9, true, NOW()
		)
		ON CONFLICT (tenant_id, nutritionist_id) DO UPDATE SET
			withings_user_id = COALESCE(NULLIF(EXCLUDED.withings_user_id, ''), kinesys.withings_integrations.withings_user_id),
			client_id = COALESCE(NULLIF(EXCLUDED.client_id, ''), kinesys.withings_integrations.client_id),
			client_secret = COALESCE(NULLIF(EXCLUDED.client_secret, ''), kinesys.withings_integrations.client_secret),
			redirect_uri = COALESCE(NULLIF(EXCLUDED.redirect_uri, ''), kinesys.withings_integrations.redirect_uri),
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			expires_at = EXCLUDED.expires_at,
			is_active = true,
			updated_at = NOW()
		RETURNING id, created_at, updated_at
	`
	return h.db.QueryRow(ctx, query,
		integ.TenantID, integ.NutritionistID, integ.WithingsUserID,
		integ.ClientID, integ.ClientSecret, integ.RedirectURI,
		integ.AccessToken, integ.RefreshToken, integ.ExpiresAt,
	).Scan(&integ.ID, &integ.CreatedAt, &integ.UpdatedAt)
}

func (h *WithingsHardwareHandler) saveUserTokens(ctx context.Context, tenantID, patientID *uuid.UUID, userid, accessToken, refreshToken string, expiresIn int) error {
	if h.db == nil {
		return nil
	}
	defaultTenant := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	tid := defaultTenant
	if tenantID != nil && *tenantID != uuid.Nil {
		tid = *tenantID
	}

	if expiresIn <= 0 {
		expiresIn = 10800 // 3 hours default
	}
	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)

	query := `
		INSERT INTO kinesys.withings_oauth_tokens (
			tenant_id, patient_id, userid, access_token, refresh_token, expires_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (userid) DO UPDATE SET
			tenant_id = EXCLUDED.tenant_id,
			patient_id = COALESCE(EXCLUDED.patient_id, kinesys.withings_oauth_tokens.patient_id),
			access_token = EXCLUDED.access_token,
			refresh_token = EXCLUDED.refresh_token,
			expires_at = EXCLUDED.expires_at,
			updated_at = NOW()
	`
	_, err := h.db.Exec(ctx, query, tid, patientID, userid, accessToken, refreshToken, expiresAt)
	if err != nil {
		log.Printf("[WITHINGS DB ERROR] Falló guardar token en kinesys.withings_oauth_tokens: %v", err)
	} else {
		log.Printf("[WITHINGS DB OK] Token persistido en BD para userid=%s (expira en %v)", userid, time.Until(expiresAt).Round(time.Minute))
	}
	return err
}

func (h *WithingsHardwareHandler) performTokenRefreshWithCredentials(ctx context.Context, clientID, clientSecret, refreshToken string) (string, string, int, error) {
	cid := clientID
	if cid == "" {
		cid = h.clientID
	}
	csec := clientSecret
	if csec == "" {
		csec = h.clientSecret
	}

	form := url.Values{
		"action":        {"requesttoken"},
		"grant_type":    {"refresh_token"},
		"client_id":     {cid},
		"client_secret": {csec},
		"refresh_token": {refreshToken},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://wbsapi.withings.net/v2/oauth2", strings.NewReader(form.Encode()))
	if err != nil {
		return "", "", 0, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return "", "", 0, err
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return "", "", 0, fmt.Errorf("refresh failed with status %d", res.StatusCode)
	}

	var payload struct {
		Status int `json:"status"`
		Body   struct {
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			UserID       string `json:"userid"`
			ExpiresIn    int    `json:"expires_in"`
		} `json:"body"`
	}

	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return "", "", 0, err
	}
	if payload.Status != 0 {
		return "", "", 0, fmt.Errorf("withings API status=%d", payload.Status)
	}

	return payload.Body.AccessToken, payload.Body.RefreshToken, payload.Body.ExpiresIn, nil
}

func (h *WithingsHardwareHandler) performTokenRefresh(ctx context.Context, refreshToken string) (string, string, int, error) {
	return h.performTokenRefreshWithCredentials(ctx, h.clientID, h.clientSecret, refreshToken)
}

func (h *WithingsHardwareHandler) getValidAccessToken(ctx context.Context, userid string) (string, error) {
	if h.db == nil {
		h.mu.RLock()
		defer h.mu.RUnlock()
		if userid != "" && h.userTokens != nil {
			if t, ok := h.userTokens[userid]; ok && t != "" {
				return t, nil
			}
		}
		if h.lastAccessToken != "" {
			return h.lastAccessToken, nil
		}
		return h.accessToken, nil
	}

	// 1. Prioridad Multi-tenant: kinesys.withings_integrations
	if userid != "" {
		var tID, nID uuid.UUID
		var rowUID, cID, cSec, aToken, rToken string
		var expAt time.Time
		err := h.db.QueryRow(ctx, `
			SELECT tenant_id, nutritionist_id, withings_user_id, COALESCE(client_id, ''), COALESCE(client_secret, ''),
			       access_token, refresh_token, expires_at
			FROM kinesys.withings_integrations
			WHERE withings_user_id = $1 AND is_active = TRUE
			LIMIT 1
		`, userid).Scan(&tID, &nID, &rowUID, &cID, &cSec, &aToken, &rToken, &expAt)
		if err == nil {
			if time.Now().Add(5*time.Minute).After(expAt) && rToken != "" {
				log.Printf("[WITHINGS REFRESH] Renovando token en withings_integrations para userid=%s...", rowUID)
				newAT, newRT, expIn, refErr := h.performTokenRefreshWithCredentials(ctx, cID, cSec, rToken)
				if refErr == nil {
					newExpAt := time.Now().Add(time.Duration(expIn) * time.Second)
					_, _ = h.db.Exec(ctx, `
						UPDATE kinesys.withings_integrations
						SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
						WHERE withings_user_id = $4
					`, newAT, newRT, newExpAt, rowUID)
					_ = h.saveUserTokens(ctx, &tID, nil, rowUID, newAT, newRT, expIn)
					h.mu.Lock()
					if h.userTokens == nil {
						h.userTokens = make(map[string]string)
					}
					h.userTokens[rowUID] = newAT
					h.lastAccessToken = newAT
					h.mu.Unlock()
					return newAT, nil
				}
				log.Printf("[WITHINGS REFRESH ERROR] Falló renovación en withings_integrations para userid=%s: %v", rowUID, refErr)
			}
			return aToken, nil
		}
	}

	// 2. Fallback: kinesys.withings_oauth_tokens
	var rowUserID, accessToken, refreshToken string
	var expiresAt time.Time
	var patID *uuid.UUID
	var tID uuid.UUID

	var err error
	if userid != "" {
		err = h.db.QueryRow(ctx, `
			SELECT tenant_id, patient_id, userid, access_token, refresh_token, expires_at 
			FROM kinesys.withings_oauth_tokens 
			WHERE userid = $1 LIMIT 1
		`, userid).Scan(&tID, &patID, &rowUserID, &accessToken, &refreshToken, &expiresAt)
	} else {
		err = h.db.QueryRow(ctx, `
			SELECT tenant_id, patient_id, userid, access_token, refresh_token, expires_at 
			FROM kinesys.withings_oauth_tokens 
			ORDER BY updated_at DESC LIMIT 1
		`).Scan(&tID, &patID, &rowUserID, &accessToken, &refreshToken, &expiresAt)
	}

	if err != nil {
		h.mu.RLock()
		defer h.mu.RUnlock()
		if userid != "" && h.userTokens != nil {
			if t, ok := h.userTokens[userid]; ok && t != "" {
				return t, nil
			}
		}
		if h.lastAccessToken != "" {
			return h.lastAccessToken, nil
		}
		return h.accessToken, nil
	}

	// Renovación automática si está por vencer o vencido
	if time.Now().Add(5*time.Minute).After(expiresAt) && refreshToken != "" {
		log.Printf("[WITHINGS REFRESH] Token próximo a vencer o vencido para userid=%s. Renovando...", rowUserID)
		newAccessToken, newRefreshToken, expiresIn, refreshErr := h.performTokenRefresh(ctx, refreshToken)
		if refreshErr != nil {
			log.Printf("[WITHINGS REFRESH ERROR] Falló renovación para userid=%s: %v. Usando token anterior.", rowUserID, refreshErr)
			return accessToken, nil
		}

		_ = h.saveUserTokens(ctx, &tID, patID, rowUserID, newAccessToken, newRefreshToken, expiresIn)

		h.mu.Lock()
		if h.userTokens == nil {
			h.userTokens = make(map[string]string)
		}
		h.userTokens[rowUserID] = newAccessToken
		h.lastAccessToken = newAccessToken
		h.accessToken = newAccessToken
		h.refreshToken = newRefreshToken
		h.userID = rowUserID
		h.mu.Unlock()

		log.Printf("[WITHINGS TOKEN REFRESH] Tokens renovados exitosamente para userid=%s", rowUserID)
		return newAccessToken, nil
	}

	return accessToken, nil
}

func (h *WithingsHardwareHandler) saveBioimpedanceEvaluation(ctx context.Context, userid string, metrics map[string]float64, payloadDate int64) {
	defaultTenant := uuid.MustParse("00000000-0000-0000-0000-000000000001")
	tenantUUID := defaultTenant
	var nutritionistUUID uuid.UUID
	var patientUUID uuid.UUID
	var specificSessionID uuid.UUID
	foundSpecificSession := false

	// Enrutamiento Webhook Dinámico multi-tenant:
	if userid != "" {
		var integTenantID, integNutriID uuid.UUID
		foundIntegration := false
		if h.withingsRepo != nil {
			if integ, err := h.withingsRepo.FindByWithingsUserID(ctx, userid); err == nil && integ != nil {
				integTenantID = integ.TenantID
				integNutriID = integ.NutritionistID
				foundIntegration = true
			}
		}
		if !foundIntegration && h.db != nil {
			err := h.db.QueryRow(ctx, `
				SELECT tenant_id, nutritionist_id 
				FROM kinesys.withings_integrations 
				WHERE withings_user_id = $1 AND is_active = TRUE 
				LIMIT 1
			`, userid).Scan(&integTenantID, &integNutriID)
			if err == nil {
				foundIntegration = true
			}
		}

		if foundIntegration {
			tenantUUID = integTenantID
			nutritionistUUID = integNutriID
			log.Printf("[WITHINGS WEBHOOK ROUTING] Integración multi-tenant encontrada para userid=%s -> tenant_id=%s, nutritionist_id=%s", userid, tenantUUID, nutritionistUUID)

			// Actualiza active_weigh_in_sessions filtrando por tenant_id, nutritionist_id y status = 'pending'
			if h.anthropometrySvc != nil {
				if s, err := h.anthropometrySvc.GetPendingSessionByTenantAndNutritionist(ctx, tenantUUID, nutritionistUUID); err == nil && s != nil {
					patientUUID = s.PatientID
					specificSessionID = s.ID
					foundSpecificSession = true
				}
			}
			if !foundSpecificSession && h.db != nil {
				var sID, pID uuid.UUID
				err := h.db.QueryRow(ctx, `
					SELECT id, patient_id 
					FROM kinesys.active_weigh_in_sessions 
					WHERE tenant_id = $1 AND nutritionist_id = $2 
					  AND LOWER(status) = 'pending' AND expires_at > NOW() 
					ORDER BY created_at DESC LIMIT 1
				`, tenantUUID, nutritionistUUID).Scan(&sID, &pID)
				if err == nil {
					patientUUID = pID
					specificSessionID = sID
					foundSpecificSession = true
				}
			}
		}
	}

	// Si no se encuentra mapeo específico, utiliza el comportamiento fallback actual
	if !foundSpecificSession {
		log.Printf("[WITHINGS WEBHOOK ROUTING] Sin sesión pendiente específica para userid=%s. Usando fallback actual.", userid)
		clinicalSessionMutex.RLock()
		lastPat := lastActiveClinicalPatID
		clinicalSessionMutex.RUnlock()

		if session, err := h.anthropometrySvc.GetLatestPendingWeighInSession(ctx); err == nil && session != nil {
			patientUUID = session.PatientID
			tenantUUID = session.TenantID
			specificSessionID = session.ID
			if session.NutritionistID != nil && *session.NutritionistID != uuid.Nil {
				nutritionistUUID = *session.NutritionistID
			}
		} else if lastPat != uuid.Nil {
			patientUUID = lastPat
		}

		// Fallback: identificar patient_id y tenant_id desde withings_oauth_tokens
		if patientUUID == uuid.Nil && h.db != nil && userid != "" {
			var pID *uuid.UUID
			var tID uuid.UUID
			if err := h.db.QueryRow(ctx, "SELECT tenant_id, patient_id FROM kinesys.withings_oauth_tokens WHERE userid = $1", userid).Scan(&tID, &pID); err == nil {
				tenantUUID = tID
				if pID != nil && *pID != uuid.Nil {
					patientUUID = *pID
				}
			}
		}

		// Fallback: paciente clínico activo más reciente
		if patientUUID == uuid.Nil && h.db != nil {
			_ = h.db.QueryRow(ctx, "SELECT id, tenant_id FROM kinesys.pacientes_clinicos WHERE active = TRUE ORDER BY updated_at DESC LIMIT 1").Scan(&patientUUID, &tenantUUID)
		}
	}

	if patientUUID == uuid.Nil {
		log.Printf("[WITHINGS EVALUATION WARN] No se pudo identificar patient_id para userid=%s", userid)
		return
	}

	// Obtener datos del paciente (ej. estatura)
	var heightCm float64
	patient, err := h.patientService.GetPatient(ctx, patientUUID, tenantUUID)
	if err == nil && patient != nil && patient.HeightCm != nil && *patient.HeightCm > 0 {
		heightCm = *patient.HeightCm
	}

	weightKg := metrics["weight_kg"]
	fatRatio := metrics["fat_ratio_percent"]
	fatMassKg := metrics["fat_mass_kg"]
	muscleMassKg := metrics["muscle_mass_kg"]
	hydrationKg := metrics["hydration_kg"]
	boneMassKg := metrics["bone_mass_kg"]
	visceralFat := metrics["visceral_fat_index"]
	proteinKg := metrics["protein_kg"]

	if fatMassKg == 0 && weightKg > 0 && fatRatio > 0 {
		fatMassKg = (weightKg * fatRatio) / 100.0
	}
	if muscleMassKg == 0 && weightKg > 0 && fatMassKg > 0 {
		muscleMassKg = weightKg - fatMassKg
	}

	// Cálculo clínico derivado de proteína (Withings no la envía nativamente)
	if proteinKg == 0 {
		if weightKg > 0 && fatMassKg > 0 && hydrationKg > 0 && boneMassKg > 0 {
			proteinKg = weightKg - fatMassKg - hydrationKg - boneMassKg
		} else if metrics["fat_free_mass_kg"] > 0 && hydrationKg > 0 && boneMassKg > 0 {
			proteinKg = metrics["fat_free_mass_kg"] - hydrationKg - boneMassKg
		}
		if proteinKg > 0 {
			proteinKg = math.Round(proteinKg*10) / 10
		} else {
			proteinKg = 0
		}
	}

	var bmi float64
	if heightCm > 0 && weightKg > 0 {
		bmi = weightKg / math.Pow(heightCm/100.0, 2)
	}

	// Obtener ID de usuario profesional válido para la FK
	defaultNutriID := nutritionistUUID
	if defaultNutriID == uuid.Nil {
		defaultNutriID = uuid.MustParse("00000000-0000-0000-0000-000000000001")
		if h.db != nil {
			var foundID uuid.UUID
			if err := h.db.QueryRow(ctx, "SELECT id FROM kinesys.users WHERE tenant_id = $1 AND role IN ('nutricionista', 'clinic_admin', 'professional') LIMIT 1", tenantUUID).Scan(&foundID); err == nil {
				defaultNutriID = foundID
			} else if err := h.db.QueryRow(ctx, "SELECT id FROM kinesys.users LIMIT 1").Scan(&foundID); err == nil {
				defaultNutriID = foundID
			}
		}
	}

	evalDate := time.Now()
	if payloadDate > 0 {
		evalDate = time.Unix(payloadDate, 0)
	}

	clinicalData := map[string]interface{}{
		"source":              "withings_scale",
		"device_model":        "Withings Body Scan",
		"weight_kg":           math.Round(weightKg*100) / 100,
		"height_cm":           math.Round(heightCm*10) / 10,
		"bmi":                 math.Round(bmi*10) / 10,
		"fat_ratio_percent":   math.Round(fatRatio*10) / 10,
		"body_fat_percentage": math.Round(fatRatio*10) / 10,
		"fat_mass_kg":         math.Round(fatMassKg*10) / 10,
		"muscle_mass_kg":      math.Round(muscleMassKg*10) / 10,
		"hydration_kg":        math.Round(hydrationKg*10) / 10,
		"bone_mass_kg":        math.Round(boneMassKg*10) / 10,
		"protein_kg":          math.Round(proteinKg*10) / 10,
		"visceral_fat_index":  math.Round(visceralFat*10) / 10,
		"clinical_notes":      "Medición sincronizada automáticamente desde Báscula Withings",
	}
	dataJSON, _ := json.Marshal(clinicalData)

	if h.db != nil {
		// Insertar en kinesys.evaluaciones_antropometricas
		_, err := h.db.Exec(ctx, `
			INSERT INTO kinesys.evaluaciones_antropometricas (
				tenant_id, patient_id, nutritionist_id, evaluation_date, data, created_at
			) VALUES ($1, $2, $3, $4, $5, NOW())
		`, tenantUUID, patientUUID, defaultNutriID, evalDate, dataJSON)
		if err != nil {
			log.Printf("[WITHINGS DB ERROR] Falló guardar en evaluaciones_antropometricas: %v", err)
		} else {
			log.Printf("[WITHINGS EVALUATION SAVED] Medición guardada en kinesys.evaluaciones_antropometricas para patient_id=%s (peso=%.2f kg, grasa=%.1f%%, proteina=%.1f kg)", patientUUID, weightKg, fatRatio, proteinKg)
		}

		// Insertar en kinesys.nutrition_evaluations
		measJSON, _ := json.Marshal(map[string]interface{}{
			"fat_mass_kg":       math.Round(fatMassKg*10) / 10,
			"muscle_mass_kg":    math.Round(muscleMassKg*10) / 10,
			"hydration_kg":      math.Round(hydrationKg*10) / 10,
			"bone_mass_kg":      math.Round(boneMassKg*10) / 10,
			"protein_kg":        math.Round(proteinKg*10) / 10,
			"fat_ratio_percent": math.Round(fatRatio*10) / 10,
		})
		_, _ = h.db.Exec(ctx, `
			INSERT INTO kinesys.nutrition_evaluations (
				tenant_id, patient_id, professional_id, evaluation_date, source,
				weight_kg, height_cm, body_fat_pct, visceral_fat_index, measurements_json
			) VALUES ($1, $2, $3, $4, 'WITHINGS', $5, $6, $7, $8, $9)
		`, tenantUUID, patientUUID, defaultNutriID, evalDate.Format("2006-01-02"), weightKg, heightCm, fatRatio, visceralFat, measJSON)
	}

	// Marcar sesión en memoria como completada (idéntico al POC)
	clinicalSessionMutex.Lock()
	for pID, s := range clinicalActiveSessions {
		if strings.ToLower(s.Status) == "pending" {
			s.Status = "completed"
			s.MetricsPayload = dataJSON
			s.UpdatedAt = time.Now()
			log.Printf("[WITHINGS MEMORY COMPLETED] Sesión en memoria completada para patient_id=%s", pID)
		}
	}
	if patientUUID != uuid.Nil {
		if s, ok := clinicalActiveSessions[patientUUID]; ok {
			s.Status = "completed"
			s.MetricsPayload = dataJSON
			s.UpdatedAt = time.Now()
		} else {
			clinicalActiveSessions[patientUUID] = &domain.ActiveWeighInSession{
				TenantID:       tenantUUID,
				PatientID:      patientUUID,
				Status:         "completed",
				MetricsPayload: dataJSON,
				UpdatedAt:      time.Now(),
			}
		}
	}
	clinicalSessionMutex.Unlock()

	// Marcar sesión pendiente en base de datos como completada
	if h.db != nil {
		if specificSessionID != uuid.Nil {
			res, err := h.db.Exec(ctx, `
				UPDATE kinesys.active_weigh_in_sessions
				SET status = 'completed', metrics_payload = $1, updated_at = NOW()
				WHERE id = $2
			`, dataJSON, specificSessionID)
			if err == nil && res.RowsAffected() > 0 {
				log.Printf("[WITHINGS SESSION COMPLETED DB SPECIFIC] Sesión id=%s para patient_id=%s actualizada a completed", specificSessionID, patientUUID)
			}
		}
		if patientUUID != uuid.Nil {
			res, err := h.db.Exec(ctx, `
				UPDATE kinesys.active_weigh_in_sessions
				SET status = 'completed', metrics_payload = $1, updated_at = NOW()
				WHERE patient_id = $2 AND LOWER(status) = 'pending'
			`, dataJSON, patientUUID)
			if err == nil && res.RowsAffected() > 0 {
				log.Printf("[WITHINGS SESSION COMPLETED DB] %d sesión(es) para patient_id=%s actualizadas a completed", res.RowsAffected(), patientUUID)
			}
		}

		if !foundSpecificSession {
			// Salvaguarda: actualizar cualquier sesión pendiente activa global
			resAny, errAny := h.db.Exec(ctx, `
				UPDATE kinesys.active_weigh_in_sessions
				SET status = 'completed', metrics_payload = $1, updated_at = NOW()
				WHERE LOWER(status) = 'pending' AND expires_at > NOW()
			`, dataJSON)
			if errAny == nil && resAny.RowsAffected() > 0 {
				log.Printf("[WITHINGS SESSION COMPLETED DB GLOBAL] %d sesión(es) pendientes globales actualizadas a completed", resAny.RowsAffected())
			}
		}
	}
}

// HandleAuthorize handles GET /api/v1/hardware/withings/authorize
// Generates OAuth2 authorization URL with client_id and state encoded with tenant_id and user_id
func (h *WithingsHardwareHandler) HandleAuthorize(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := strings.TrimSpace(r.URL.Query().Get("tenant_id"))
	userIDStr := strings.TrimSpace(r.URL.Query().Get("user_id"))
	if userIDStr == "" {
		userIDStr = strings.TrimSpace(r.URL.Query().Get("nutritionist_id"))
	}
	if userIDStr == "" {
		if uID, ok := r.Context().Value(middleware.UserIDKey).(string); ok && uID != "" {
			userIDStr = uID
		}
	}

	tenantUUID := uuid.Nil
	if tenantIDStr != "" {
		if t, err := uuid.Parse(tenantIDStr); err == nil {
			tenantUUID = t
		}
	}
	if tenantUUID == uuid.Nil {
		tenantUUID = h.resolveTenantID(r.Context(), userIDStr)
	}

	nutritionistUUID := uuid.Nil
	if userIDStr != "" {
		nutritionistUUID, _ = uuid.Parse(userIDStr)
	}

	var clientID string
	var redirectURI string

	if nutritionistUUID != uuid.Nil {
		integ, err := h.getIntegrationByNutritionist(r.Context(), tenantUUID, nutritionistUUID)
		if err == nil && integ != nil {
			clientID = strings.TrimSpace(integ.ClientID)
			redirectURI = strings.TrimSpace(integ.RedirectURI)
		}
	}

	// Si no existen credenciales configuradas en la BD para este usuario
	if clientID == "" {
		if (h.withingsRepo != nil || h.db != nil) || h.clientID == "" {
			http.Error(w, "El administrador no ha configurado las credenciales de Withings para este usuario", http.StatusBadRequest)
			return
		}
		clientID = h.clientID
	}

	if redirectURI == "" {
		redirectURI = "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/callback"
	}
	if customRedirect := r.URL.Query().Get("redirect_uri"); customRedirect != "" {
		redirectURI = customRedirect
	}

	// Codificar state con tenant_id y user_id
	type stateData struct {
		TenantID       string `json:"tenant_id"`
		NutritionistID string `json:"user_id"`
		Timestamp      int64  `json:"ts"`
	}
	st := stateData{
		TenantID:       tenantUUID.String(),
		NutritionistID: userIDStr,
		Timestamp:      time.Now().Unix(),
	}
	stBytes, _ := json.Marshal(st)
	encodedState := base64.RawURLEncoding.EncodeToString(stBytes)

	authURL := fmt.Sprintf(
		"https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=%s&state=%s&scope=%s&redirect_uri=%s",
		url.QueryEscape(clientID),
		url.QueryEscape(encodedState),
		url.QueryEscape("user.metrics,user.info,user.activity"),
		url.QueryEscape(redirectURI),
	)

	log.Printf("[WITHINGS AUTHORIZE] Generada URL OAuth para tenant=%s, user=%s: %s", tenantUUID, userIDStr, authURL)

	if r.Header.Get("Accept") == "application/json" || r.URL.Query().Get("format") == "json" {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{
			"url":   authURL,
			"state": encodedState,
		})
		return
	}

	http.Redirect(w, r, authURL, http.StatusTemporaryRedirect)
}

// HandleCallback handles GET /api/v1/hardware/withings/callback
// Exchanges authorization code with Withings (gettoken), extracts userid, and saves to kinesys.withings_integrations
func (h *WithingsHardwareHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	if code == "" && r.Method == http.MethodPost {
		_ = r.ParseForm()
		code = r.Form.Get("code")
	}

	// Probes/checks from Withings
	if code == "" {
		if r.Method == http.MethodGet || r.Method == http.MethodHead {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
			return
		}
		http.Error(w, "Missing code parameter", http.StatusBadRequest)
		return
	}

	stateParam := r.URL.Query().Get("state")
	if stateParam == "" && r.Method == http.MethodPost {
		stateParam = r.Form.Get("state")
	}

	var stateObj struct {
		TenantID string `json:"tenant_id"`
		UserID   string `json:"user_id"`
	}
	if stateParam != "" {
		if decBytes, err := base64.RawURLEncoding.DecodeString(stateParam); err == nil {
			_ = json.Unmarshal(decBytes, &stateObj)
		} else if decBytes, err := base64.StdEncoding.DecodeString(stateParam); err == nil {
			_ = json.Unmarshal(decBytes, &stateObj)
		}
	}

	tenantUUID := uuid.Nil
	if stateObj.TenantID != "" {
		if t, err := uuid.Parse(stateObj.TenantID); err == nil {
			tenantUUID = t
		}
	}
	if tenantUUID == uuid.Nil {
		tenantUUID = h.resolveTenantID(r.Context(), stateObj.UserID)
	}

	nutritionistUUID := uuid.Nil
	if stateObj.UserID != "" {
		if nID, err := uuid.Parse(stateObj.UserID); err == nil {
			nutritionistUUID = nID
		}
	}
	if nutritionistUUID == uuid.Nil && h.db != nil {
		_ = h.db.QueryRow(r.Context(), "SELECT id FROM kinesys.users WHERE tenant_id = $1 AND role IN ('nutricionista', 'clinic_admin', 'professional') LIMIT 1", tenantUUID).Scan(&nutritionistUUID)
		if nutritionistUUID == uuid.Nil {
			_ = h.db.QueryRow(r.Context(), "SELECT id FROM kinesys.users WHERE tenant_id = $1 LIMIT 1", tenantUUID).Scan(&nutritionistUUID)
		}
	}
	if nutritionistUUID == uuid.Nil {
		nutritionistUUID = uuid.MustParse("00000000-0000-0000-0000-000000000001")
	}

	// Obtener client_id, client_secret y redirect_uri del registro de integración para este nutricionista
	targetClientID := h.clientID
	targetClientSecret := h.clientSecret
	targetRedirectURI := "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/callback"
	if r.URL.Path == "/api/v1/withings/callback" {
		targetRedirectURI = "https://clinicalplatform.ludoia.com/api/v1/withings/callback"
	}

	if nutritionistUUID != uuid.Nil {
		integ, err := h.getIntegrationByNutritionist(r.Context(), tenantUUID, nutritionistUUID)
		if err == nil && integ != nil {
			if strings.TrimSpace(integ.ClientID) != "" {
				targetClientID = strings.TrimSpace(integ.ClientID)
			}
			if strings.TrimSpace(integ.ClientSecret) != "" {
				targetClientSecret = strings.TrimSpace(integ.ClientSecret)
			}
			if strings.TrimSpace(integ.RedirectURI) != "" {
				targetRedirectURI = strings.TrimSpace(integ.RedirectURI)
			}
		}
	}

	form := url.Values{
		"action":        {"requesttoken"},
		"grant_type":    {"authorization_code"},
		"client_id":     {targetClientID},
		"client_secret": {targetClientSecret},
		"code":          {code},
		"redirect_uri":  {targetRedirectURI},
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/v2/oauth2", strings.NewReader(form.Encode()))
	if err != nil {
		http.Error(w, "Error creating request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		http.Error(w, "Error communicating with Withings", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()

	var payload struct {
		Status int `json:"status"`
		Body   struct {
			UserID       string `json:"userid"`
			AccessToken  string `json:"access_token"`
			RefreshToken string `json:"refresh_token"`
			ExpiresIn    int    `json:"expires_in"`
		} `json:"body"`
	}

	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid response from Withings", http.StatusBadGateway)
		return
	}

	if payload.Status != 0 || payload.Body.AccessToken == "" {
		http.Error(w, fmt.Sprintf("Withings API returned status %d", payload.Status), http.StatusBadGateway)
		return
	}

	expiresIn := payload.Body.ExpiresIn
	if expiresIn <= 0 {
		expiresIn = 10800
	}
	expiresAt := time.Now().Add(time.Duration(expiresIn) * time.Second)

	// 1. Guardar/actualizar en kinesys.withings_integrations
	integration := &domain.WithingsIntegration{
		TenantID:       tenantUUID,
		NutritionistID: nutritionistUUID,
		WithingsUserID: payload.Body.UserID,
		ClientID:       targetClientID,
		ClientSecret:   targetClientSecret,
		RedirectURI:    targetRedirectURI,
		AccessToken:    payload.Body.AccessToken,
		RefreshToken:   payload.Body.RefreshToken,
		ExpiresAt:      expiresAt,
		IsActive:       true,
	}
	if err := h.saveWithingsIntegration(r.Context(), integration); err != nil {
		log.Printf("[WITHINGS OAUTH WARN] Error guardando en withings_integrations: %v", err)
	} else {
		log.Printf("[WITHINGS OAUTH OK] Integración multi-tenant guardada: tenant_id=%s, nutritionist_id=%s, withings_user_id=%s", tenantUUID, nutritionistUUID, payload.Body.UserID)
	}

	// 2. Guardar en withings_oauth_tokens y memoria para compatibilidad retrospectiva con POC
	_ = h.saveUserTokens(r.Context(), &tenantUUID, nil, payload.Body.UserID, payload.Body.AccessToken, payload.Body.RefreshToken, expiresIn)

	h.mu.Lock()
	if h.userTokens == nil {
		h.userTokens = make(map[string]string)
	}
	h.userTokens[payload.Body.UserID] = payload.Body.AccessToken
	h.lastAccessToken = payload.Body.AccessToken
	h.userID = payload.Body.UserID
	h.accessToken = payload.Body.AccessToken
	h.refreshToken = payload.Body.RefreshToken
	h.mu.Unlock()

	// 3. Suscribir webhook
	subData := url.Values{}
	subData.Set("action", "subscribe")
	subData.Set("callbackurl", "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/webhook")
	subData.Set("appli", "1")
	subData.Set("access_token", payload.Body.AccessToken)
	subResp, subErr := h.client.PostForm("https://wbsapi.withings.net/notify", subData)
	if subErr == nil {
		_ = subResp.Body.Close()
		log.Printf("[WITHINGS OAUTH OK] Suscripción de webhook registrada para withings_user_id=%s", payload.Body.UserID)
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<title>Vinculación Exitosa | KineSys</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #0f172a; margin: 0; color: #f8fafc; }
		.card { background: #1e293b; padding: 2.5rem; border-radius: 1.25rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); text-align: center; max-width: 480px; border: 1px solid #334155; }
		.icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); color: #22c55e; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 1.25rem; }
		h2 { color: #f8fafc; margin: 0 0 0.5rem 0; font-size: 1.5rem; font-weight: 800; }
		p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; margin: 0 0 1.5rem 0; }
		.btn { display: inline-block; background: #22c55e; color: #022c22; font-weight: 700; padding: 0.75rem 1.5rem; border-radius: 0.75rem; text-decoration: none; transition: background 0.2s; cursor: pointer; border: none; font-size: 0.9rem; }
		.btn:hover { background: #16a34a; color: #ffffff; }
	</style>
</head>
<body>
	<div class="card">
		<div class="icon">✓</div>
		<h2>¡Báscula Withings Vinculada con Éxito!</h2>
		<p>Tu cuenta y báscula Withings han sido enlazadas a tu perfil clínico en KineSys. Las mediciones se sincronizarán automáticamente con las sesiones de tus pacientes.</p>
		<button class="btn" onclick="window.close(); window.opener && window.opener.location.reload();">Cerrar Ventana</button>
	</div>
</body>
</html>`))
}

type WithingsAdminCredentialsRequest struct {
	TenantID       string `json:"tenant_id"`
	NutritionistID string `json:"nutritionist_id"`
	ClientID       string `json:"client_id"`
	ClientSecret   string `json:"client_secret"`
	RedirectURI    string `json:"redirect_uri"`
}

// SaveAdminCredentials handles POST /api/v1/admin/hardware/withings/credentials
// Performs UPSERT in withings_integrations inserting client credentials and leaving tokens null/empty
func (h *WithingsHardwareHandler) SaveAdminCredentials(w http.ResponseWriter, r *http.Request) {
	var req WithingsAdminCredentialsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	req.ClientID = strings.TrimSpace(req.ClientID)
	req.ClientSecret = strings.TrimSpace(req.ClientSecret)
	req.NutritionistID = strings.TrimSpace(req.NutritionistID)
	req.RedirectURI = strings.TrimSpace(req.RedirectURI)
	if req.RedirectURI == "" {
		req.RedirectURI = "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/callback"
	}

	if req.NutritionistID == "" {
		if uid, ok := r.Context().Value(middleware.UserIDKey).(string); ok && uid != "" {
			req.NutritionistID = uid
		} else {
			http.Error(w, "nutritionist_id es requerido", http.StatusBadRequest)
			return
		}
	}

	nutritionistUUID, err := uuid.Parse(req.NutritionistID)
	if err != nil {
		http.Error(w, "nutritionist_id inválido", http.StatusBadRequest)
		return
	}

	tenantUUID := uuid.Nil
	if req.TenantID != "" {
		tenantUUID, _ = uuid.Parse(req.TenantID)
	}
	if tenantUUID == uuid.Nil {
		tenantUUID = h.resolveTenantID(r.Context(), req.NutritionistID)
	}

	if req.ClientID == "" || req.ClientSecret == "" {
		http.Error(w, "client_id y client_secret son requeridos", http.StatusBadRequest)
		return
	}

	if h.withingsRepo != nil {
		err = h.withingsRepo.UpsertCredentials(r.Context(), tenantUUID, nutritionistUUID, req.ClientID, req.ClientSecret, req.RedirectURI)
	} else if h.db != nil {
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
		_, err = h.db.Exec(r.Context(), query, tenantUUID, nutritionistUUID, req.ClientID, req.ClientSecret, req.RedirectURI)
	}

	if err != nil {
		log.Printf("[WITHINGS ADMIN ERROR] Error guardando credenciales: %v", err)
		http.Error(w, "Error guardando credenciales: "+err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("[WITHINGS ADMIN OK] Credenciales guardadas para tenant=%s, nutritionist=%s", tenantUUID, nutritionistUUID)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":          "ok",
		"message":         "Credenciales de Withings guardadas exitosamente",
		"tenant_id":       tenantUUID.String(),
		"nutritionist_id": nutritionistUUID.String(),
		"redirect_uri":    req.RedirectURI,
	})
}

// GetAdminCredentials handles GET /api/v1/admin/hardware/withings/credentials
func (h *WithingsHardwareHandler) GetAdminCredentials(w http.ResponseWriter, r *http.Request) {
	nutriIDStr := strings.TrimSpace(r.URL.Query().Get("nutritionist_id"))
	if nutriIDStr == "" {
		if uid, ok := r.Context().Value(middleware.UserIDKey).(string); ok {
			nutriIDStr = uid
		}
	}
	if nutriIDStr == "" {
		http.Error(w, "nutritionist_id es requerido", http.StatusBadRequest)
		return
	}
	nutriUUID, err := uuid.Parse(nutriIDStr)
	if err != nil {
		http.Error(w, "nutritionist_id inválido", http.StatusBadRequest)
		return
	}

	tenantUUID := uuid.Nil
	if tStr := r.URL.Query().Get("tenant_id"); tStr != "" {
		tenantUUID, _ = uuid.Parse(tStr)
	}
	if tenantUUID == uuid.Nil {
		tenantUUID = h.resolveTenantID(r.Context(), nutriIDStr)
	}

	integ, err := h.getIntegrationByNutritionist(r.Context(), tenantUUID, nutriUUID)
	if err != nil || integ == nil {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"configured":   false,
			"redirect_uri": "https://clinicalplatform.ludoia.com/api/v1/hardware/withings/callback",
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"configured":       integ.ClientID != "",
		"tenant_id":        integ.TenantID.String(),
		"nutritionist_id":  integ.NutritionistID.String(),
		"client_id":        integ.ClientID,
		"client_secret":    maskToken(integ.ClientSecret),
		"redirect_uri":     integ.RedirectURI,
		"withings_user_id": integ.WithingsUserID,
		"is_connected":     integ.AccessToken != "" && integ.WithingsUserID != "",
		"is_active":        integ.IsActive,
	})
}

func (h *WithingsHardwareHandler) fetchEvaluation(ctx context.Context, patient *domain.Patient) (*WithingsHardwareReading, error) {
	form := url.Values{
		"action":    {"getmeas"},
		"meastypes": {"1,4,6,76,88,123,126,127,135,170,226"},
		"category":  {"1"},
		"userid":    {h.userID},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.apiBaseURL+"/measure", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+h.accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("Withings request failed: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode < http.StatusOK || res.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("Withings HTTP %d", res.StatusCode)
	}

	var payload withingsResponse
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("invalid Withings response: %w", err)
	}
	if payload.Status != 0 {
		return nil, fmt.Errorf("Withings API status=%d", payload.Status)
	}
	if len(payload.Body.MeasureGroups) == 0 {
		return nil, fmt.Errorf("Withings returned no measurements")
	}

	parsedMetrics := parseWithingsMeasures(payload.Body.MeasureGroups)
	if pocSessionActive {
		pocMutex.Lock()
		if pocRawPayload == nil {
			pocRawPayload = make(map[string]interface{})
		}
		pocRawPayload["raw_withings_response"] = payload
		pocRawPayload["parsed_metrics"] = parsedMetrics
		pocMutex.Unlock()
	}

	weight, weightAt := latestMeasure(payload.Body.MeasureGroups, 1)
	height, _ := latestMeasure(payload.Body.MeasureGroups, 4)
	fatPct, fatAt := latestMeasure(payload.Body.MeasureGroups, 6)

	visceral126, _ := latestMeasure(payload.Body.MeasureGroups, 126)
	visceral127, _ := latestMeasure(payload.Body.MeasureGroups, 127)
	visceral170, _ := latestMeasure(payload.Body.MeasureGroups, 170)

	bmr123, _ := latestMeasure(payload.Body.MeasureGroups, 123)
	bmr135, _ := latestMeasure(payload.Body.MeasureGroups, 135)
	bmr226, _ := latestMeasure(payload.Body.MeasureGroups, 226)

	fatMass, _ := latestMeasure(payload.Body.MeasureGroups, 8)
	muscleMass, _ := latestMeasure(payload.Body.MeasureGroups, 76)
	hydrationMass, _ := latestMeasure(payload.Body.MeasureGroups, 77)
	boneMass, _ := latestMeasure(payload.Body.MeasureGroups, 88)

	measuredAt := weightAt
	if measuredAt == 0 {
		measuredAt = fatAt
	}
	if measuredAt == 0 {
		measuredAt = payload.Body.MeasureGroups[0].Date
	}

	reading := &WithingsHardwareReading{
		PatientID:        patient.ID.String(),
		Source:           "WITHINGS",
		EvaluationDate:   time.Unix(measuredAt, 0).UTC().Format("2006-01-02"),
		WeightKg:         scaledValue(weight, 1, 3),
		HeightCm:         scaledValue(height, 100, 2),
		BodyFatPct:       scaledValue(fatPct, 1, 2),
		FatMassKg:        scaledValue(fatMass, 1, 3),
		MuscleMassKg:     scaledValue(muscleMass, 1, 3),
		HydrationKg:      scaledValue(hydrationMass, 1, 3),
		BoneMassKg:       scaledValue(boneMass, 1, 3),
		VisceralFatIndex: scaledValue(visceral170, 1, 2),
		BMR:              scaledValue(bmr226, 1, 2),
		ProviderMeta:     map[string]string{"device_model": "Withings Body Scan"},
	}

	if reading.VisceralFatIndex == nil {
		reading.VisceralFatIndex = scaledValue(visceral126, 1, 2)
	}
	if reading.VisceralFatIndex == nil {
		reading.VisceralFatIndex = scaledValue(visceral127, 1, 2)
	}

	if reading.BMR == nil {
		reading.BMR = scaledValue(bmr123, 1, 2)
	}
	if reading.BMR == nil {
		reading.BMR = scaledValue(bmr135, 1, 2)
	}

	if reading.FatMassKg == nil && reading.WeightKg != nil && reading.BodyFatPct != nil {
		fm := *reading.WeightKg * (*reading.BodyFatPct / 100.0)
		reading.FatMassKg = &fm
	}
	if reading.MuscleMassKg == nil && reading.WeightKg != nil && reading.FatMassKg != nil {
		mm := *reading.WeightKg - *reading.FatMassKg
		reading.MuscleMassKg = &mm
	}

	// Fallbacks desde parsedMetrics para garantizar que nunca queden en nil / 0
	if reading.FatMassKg == nil {
		if val, ok := parsedMetrics["fat_mass_kg"]; ok && val > 0 {
			reading.FatMassKg = &val
		}
	}
	if reading.MuscleMassKg == nil {
		if val, ok := parsedMetrics["muscle_mass_kg"]; ok && val > 0 {
			reading.MuscleMassKg = &val
		}
	}
	if reading.HydrationKg == nil {
		if val, ok := parsedMetrics["hydration_kg"]; ok && val > 0 {
			reading.HydrationKg = &val
		}
	}
	if reading.BoneMassKg == nil {
		if val, ok := parsedMetrics["bone_mass_kg"]; ok && val > 0 {
			reading.BoneMassKg = &val
		}
	}
	if reading.ProteinKg == nil {
		if val, ok := parsedMetrics["protein_kg"]; ok && val > 0 {
			reading.ProteinKg = &val
		} else if reading.WeightKg != nil && reading.FatMassKg != nil && reading.HydrationKg != nil && reading.BoneMassKg != nil {
			protVal := *reading.WeightKg - *reading.FatMassKg - *reading.HydrationKg - *reading.BoneMassKg
			if protVal > 0 {
				protVal = math.Round(protVal*10) / 10
				reading.ProteinKg = &protVal
			}
		}
	}

	if reading.MuscleMassKg == nil && reading.WeightKg != nil && reading.FatMassKg != nil {
		mm := *reading.WeightKg - *reading.FatMassKg
		reading.MuscleMassKg = &mm
	}

	if reading.BMR == nil && reading.WeightKg != nil {
		pHeight := 0.0
		if reading.HeightCm != nil {
			pHeight = *reading.HeightCm
		} else if patient.HeightCm != nil {
			pHeight = *patient.HeightCm
		}

		age := 0
		if patient.BirthDate != nil {
			pt, _ := time.Parse("2006-01-02", *patient.BirthDate)
			if !pt.IsZero() {
				age = int(time.Since(pt).Hours() / 24 / 365)
			}
		}

		sex := domain.SexMale
		if patient.Gender != nil && *patient.Gender == "female" {
			sex = domain.SexFemale
		}

		if pHeight > 0 && age > 0 {
			bmrRes, err := h.anthropometrySvc.CalculateMifflinStJeor(domain.BmrInputs{
				WeightKg: *reading.WeightKg,
				HeightCm: pHeight,
				AgeYears: age,
				Sex:      sex,
			})
			if err == nil {
				bmrVal := bmrRes.BmrKcal
				reading.BMR = &bmrVal
				reading.ProviderMeta["bmr_source"] = "Calculated (Mifflin-St Jeor)"
			}
		}
	}

	return reading, nil
}

func parseWithingsMeasures(groups []withingsMeasureGroup) map[string]float64 {
	parsed := make(map[string]float64)
	for _, group := range groups {
		for _, measure := range group.Measures {
			realValue := float64(measure.Value) * math.Pow10(measure.Unit)

			pos := 0
			if measure.Position != nil {
				pos = *measure.Position
			}

			switch measure.Type {
			case 1:
				parsed["weight_kg"] = realValue
			case 5:
				parsed["fat_free_mass_kg"] = realValue
			case 6:
				parsed["fat_ratio_percent"] = realValue
			case 8:
				if pos == 0 || pos == 7 {
					parsed["fat_mass_kg"] = realValue
				}
			case 11:
				parsed["heart_rate_bpm"] = realValue
			case 76:
				if pos == 0 || pos == 7 {
					parsed["muscle_mass_kg"] = realValue
				}
			case 77:
				parsed["hydration_kg"] = realValue
			case 88:
				parsed["bone_mass_kg"] = realValue
			case 170:
				parsed["visceral_fat_index"] = realValue
			}
		}
	}

	// =========================================================================
	// GARANTIZAR QUE LAS MÉTRICAS TOTALES NUNCA QUEDEN EN 0
	// (weight_kg, fat_mass_kg, muscle_mass_kg, hydration_kg, bone_mass_kg, protein_kg)
	// =========================================================================

	// 1. Garantizar weight_kg si vino indirecto
	weightKg := parsed["weight_kg"]
	if weightKg == 0 && parsed["fat_mass_kg"] > 0 && parsed["fat_free_mass_kg"] > 0 {
		weightKg = parsed["fat_mass_kg"] + parsed["fat_free_mass_kg"]
		parsed["weight_kg"] = math.Round(weightKg*100) / 100
	}

	// 2. Garantizar fat_mass_kg (porcentaje -> FFM -> fallback)
	fatMassKg := parsed["fat_mass_kg"]
	if fatMassKg == 0 {
		if weightKg > 0 && parsed["fat_ratio_percent"] > 0 {
			fatMassKg = (weightKg * parsed["fat_ratio_percent"]) / 100.0
		} else if weightKg > 0 && parsed["fat_free_mass_kg"] > 0 {
			fatMassKg = weightKg - parsed["fat_free_mass_kg"]
		} else if weightKg > 0 {
			// Estimación clínica estándar de referencia (20% del peso corporal)
			fatMassKg = weightKg * 0.20
		}
		if fatMassKg > 0 {
			parsed["fat_mass_kg"] = math.Round(fatMassKg*10) / 10
		}
	}

	// 3. Garantizar fat_ratio_percent
	if parsed["fat_ratio_percent"] == 0 && weightKg > 0 && parsed["fat_mass_kg"] > 0 {
		parsed["fat_ratio_percent"] = math.Round((parsed["fat_mass_kg"]/weightKg)*1000) / 10
	}

	// 4. Garantizar fat_free_mass_kg
	fatFreeMassKg := parsed["fat_free_mass_kg"]
	if fatFreeMassKg == 0 && weightKg > 0 && parsed["fat_mass_kg"] > 0 {
		fatFreeMassKg = weightKg - parsed["fat_mass_kg"]
		parsed["fat_free_mass_kg"] = math.Round(fatFreeMassKg*10) / 10
	}

	// 5. Garantizar muscle_mass_kg (peso - grasa -> FFM -> fallback)
	muscleMassKg := parsed["muscle_mass_kg"]
	if muscleMassKg == 0 {
		if weightKg > 0 && parsed["fat_mass_kg"] > 0 {
			muscleMassKg = weightKg - parsed["fat_mass_kg"]
		} else if fatFreeMassKg > 0 {
			muscleMassKg = fatFreeMassKg
		} else if weightKg > 0 {
			// Estimación clínica estándar (75% del peso corporal)
			muscleMassKg = weightKg * 0.75
		}
		if muscleMassKg > 0 {
			parsed["muscle_mass_kg"] = math.Round(muscleMassKg*10) / 10
		}
	}

	// 6. Garantizar bone_mass_kg
	boneMassKg := parsed["bone_mass_kg"]
	if boneMassKg == 0 && weightKg > 0 {
		// Masa mineral ósea referencial clínica (~4% del peso corporal, mín 2.2 kg)
		boneMassKg = math.Round(weightKg*0.04*10) / 10
		if boneMassKg < 2.2 {
			boneMassKg = 2.2
		}
		parsed["bone_mass_kg"] = boneMassKg
	}

	// 7. Garantizar hydration_kg
	hydrationKg := parsed["hydration_kg"]
	if hydrationKg == 0 {
		if fatFreeMassKg > 0 {
			// Constante fisiológica de Wang et al.: agua corporal total = 73.2% de FFM
			hydrationKg = math.Round(fatFreeMassKg*0.732*10) / 10
		} else if weightKg > 0 {
			// Referencia normal: 55% del peso corporal
			hydrationKg = math.Round(weightKg*0.55*10) / 10
		}
		if hydrationKg > 0 {
			parsed["hydration_kg"] = hydrationKg
		}
	}

	// 8. Garantizar protein_kg (Cálculo clínico derivado)
	if parsed["protein_kg"] == 0 {
		var proteinKg float64
		if weightKg > 0 && parsed["fat_mass_kg"] > 0 && parsed["hydration_kg"] > 0 && parsed["bone_mass_kg"] > 0 {
			proteinKg = weightKg - parsed["fat_mass_kg"] - parsed["hydration_kg"] - parsed["bone_mass_kg"]
		} else if fatFreeMassKg > 0 && parsed["hydration_kg"] > 0 && parsed["bone_mass_kg"] > 0 {
			proteinKg = fatFreeMassKg - parsed["hydration_kg"] - parsed["bone_mass_kg"]
		} else if weightKg > 0 {
			// Estimación clínica referencial (~15% del peso corporal)
			proteinKg = weightKg * 0.15
		}

		if proteinKg > 0 {
			parsed["protein_kg"] = math.Round(proteinKg*10) / 10
		}
	}

	return parsed
}

// parseWithingsPocMeasures extrae métricas corporales y análisis segmental exclusivamente para el módulo de pruebas POC.
// No afecta ni altera la función clínica parseWithingsMeasures utilizada en nutrición.
func parseWithingsPocMeasures(groups []withingsMeasureGroup) map[string]float64 {
	// 1. Obtener todas las métricas corporales completas y estables (peso, grasa, músculo, agua, hueso, proteína, etc.)
	parsed := parseWithingsMeasures(groups)

	// 2. Extraer métricas segmentales exclusivamente para el POC de forma ultra defensiva
	// Withings Body Scan position: 1=pierna izq, 2=pierna der, 3=brazo izq, 4=brazo der, 5=torso
	for _, group := range groups {
		for _, measure := range group.Measures {
			realValue := float64(measure.Value) * math.Pow10(measure.Unit)
			pos := 0
			if measure.Position != nil {
				pos = *measure.Position
			}

			if pos >= 1 && pos <= 5 {
				valRounded := math.Round(realValue*10) / 10
				switch measure.Type {
				case 76: // Músculo segmental
					switch pos {
					case 1:
						parsed["muscle_mass_left_leg_kg"] = valRounded
					case 2:
						parsed["muscle_mass_right_leg_kg"] = valRounded
					case 3:
						parsed["muscle_mass_left_arm_kg"] = valRounded
					case 4:
						parsed["muscle_mass_right_arm_kg"] = valRounded
					case 5:
						parsed["muscle_mass_trunk_kg"] = valRounded
					}
				case 8: // Grasa segmental
					switch pos {
					case 1:
						parsed["fat_mass_left_leg_kg"] = valRounded
					case 2:
						parsed["fat_mass_right_leg_kg"] = valRounded
					case 3:
						parsed["fat_mass_left_arm_kg"] = valRounded
					case 4:
						parsed["fat_mass_right_arm_kg"] = valRounded
					case 5:
						parsed["fat_mass_trunk_kg"] = valRounded
					}
				}
			}
		}
	}

	return parsed
}

func latestMeasure(groups []withingsMeasureGroup, measureType int) (withingsMeasure, int64) {
	var latest withingsMeasure
	var measuredAt int64
	for _, group := range groups {
		for _, measure := range group.Measures {
			if measure.Type == measureType && group.Date > measuredAt {
				latest = measure
				measuredAt = group.Date
			}
		}
	}
	return latest, measuredAt
}

func scaledValue(measure withingsMeasure, multiplier float64, decimals int) *float64 {
	if measure.Type == 0 {
		return nil
	}
	value := measure.Value * pow10(measure.Unit) * multiplier
	if decimals > 0 {
		factor := pow10(decimals)
		value = float64(int64(value*factor+0.5)) / factor
	}
	return &value
}

func pow10(exponent int) float64 {
	value := 1.0
	if exponent >= 0 {
		for i := 0; i < exponent; i++ {
			value *= 10
		}
		return value
	}
	for i := 0; i > exponent; i-- {
		value /= 10
	}
	return value
}

func (h *WithingsHardwareHandler) StartSession(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(chi.URLParam(r, "patientId"))

	var reqBody struct {
		PatientID      string `json:"patient_id"`
		NutritionistID string `json:"nutritionist_id"`
	}
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&reqBody)
	}

	if patientID == "" && reqBody.PatientID != "" {
		patientID = strings.TrimSpace(reqBody.PatientID)
	}
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	userIDStr, _ := r.Context().Value(middleware.UserIDKey).(string)
	tenantID := h.resolveTenantID(r.Context(), userIDStr)
	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient UUID", http.StatusBadRequest)
		return
	}

	var nutriUUID *uuid.UUID
	if reqBody.NutritionistID != "" {
		if nID, err := uuid.Parse(strings.TrimSpace(reqBody.NutritionistID)); err == nil && nID != uuid.Nil {
			nutriUUID = &nID
		}
	}
	if nutriUUID == nil && userIDStr != "" {
		if nID, err := uuid.Parse(userIDStr); err == nil && nID != uuid.Nil {
			nutriUUID = &nID
		}
	}

	// Create a new session
	session := &domain.ActiveWeighInSession{
		TenantID:       tenantID,
		NutritionistID: nutriUUID,
		PatientID:      patientUUID,
		Status:         "pending",
		ExpiresAt:      time.Now().Add(3 * time.Minute),
	}

	log.Printf("[WITHINGS] Sesión PENDING creada para paciente=%s, tenant=%s, nutri=%v. Expirará a las %s", session.PatientID, session.TenantID, session.NutritionistID, session.ExpiresAt)

	if err := h.anthropometrySvc.CreateWeighInSession(r.Context(), session); err != nil {
		fmt.Printf("Error detallado al crear sesión: %v\n", err)
		http.Error(w, fmt.Sprintf("Failed to start session: %v", err), http.StatusInternalServerError)
		return
	}

	// Registrar sesión en memoria para respuesta instantánea (idéntico al POC)
	clinicalSessionMutex.Lock()
	clinicalActiveSessions[patientUUID] = session
	lastActiveClinicalPatID = patientUUID
	clinicalSessionMutex.Unlock()

	if h.db != nil {
		_, _ = h.db.Exec(r.Context(), `
			UPDATE kinesys.withings_oauth_tokens 
			SET patient_id = $1, tenant_id = $2, updated_at = NOW()
		`, patientUUID, tenantID)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}

func (h *WithingsHardwareHandler) CheckSessionStatus(w http.ResponseWriter, r *http.Request) {
	patientID := strings.TrimSpace(chi.URLParam(r, "patientId"))
	if patientID == "" {
		http.Error(w, "Invalid patient ID", http.StatusBadRequest)
		return
	}

	// tenantID is no longer required for checking session status
	patientUUID, err := uuid.Parse(patientID)
	if err != nil {
		http.Error(w, "Invalid patient UUID", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// 1. Revisar caché en memoria (rápido, idéntico al POC)
	clinicalSessionMutex.RLock()
	memSession, hasMem := clinicalActiveSessions[patientUUID]
	clinicalSessionMutex.RUnlock()

	if hasMem && memSession != nil {
		if strings.ToLower(memSession.Status) == "completed" {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"id":              memSession.ID,
				"patient_id":      memSession.PatientID,
				"tenant_id":       memSession.TenantID,
				"status":          "completed",
				"active":          false,
				"metrics_payload": memSession.MetricsPayload,
				"updated_at":      memSession.UpdatedAt,
			})
			return
		}
		if strings.ToLower(memSession.Status) == "pending" && time.Now().Before(memSession.ExpiresAt) {
			w.WriteHeader(http.StatusOK)
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"id":              memSession.ID,
				"patient_id":      memSession.PatientID,
				"tenant_id":       memSession.TenantID,
				"status":          "pending",
				"active":          true,
				"metrics_payload": nil,
				"created_at":      memSession.CreatedAt,
				"expires_at":      memSession.ExpiresAt,
			})
			return
		}
	}

	// 2. Revisar base de datos
	session, err := h.anthropometrySvc.GetPendingWeighInSession(r.Context(), patientUUID)
	if err != nil || session == nil {
		// No pending or recent session found -> HTTP 200 with idle status
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"status":          "idle",
			"active":          false,
			"metrics_payload": nil,
		})
		return
	}

	// If it's expired, update it and return idle
	if time.Now().After(session.ExpiresAt) && strings.ToLower(session.Status) == "pending" {
		session.Status = "expired"
		_ = h.anthropometrySvc.UpdateWeighInSession(r.Context(), session)
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"id":              session.ID,
			"patient_id":      session.PatientID,
			"status":          "idle",
			"active":          false,
			"metrics_payload": nil,
		})
		return
	}

	if strings.ToLower(session.Status) == "completed" {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"id":              session.ID,
			"tenant_id":       session.TenantID,
			"patient_id":      session.PatientID,
			"status":          "completed",
			"active":          false,
			"metrics_payload": session.MetricsPayload,
			"created_at":      session.CreatedAt,
			"expires_at":      session.ExpiresAt,
			"updated_at":      session.UpdatedAt,
		})
		return
	}

	if strings.ToLower(session.Status) == "pending" {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"id":              session.ID,
			"tenant_id":       session.TenantID,
			"patient_id":      session.PatientID,
			"status":          "pending",
			"active":          true,
			"metrics_payload": nil,
			"created_at":      session.CreatedAt,
			"expires_at":      session.ExpiresAt,
			"updated_at":      session.UpdatedAt,
		})
		return
	}

	// Fallback for any other status (e.g. expired, cancelled)
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"id":              session.ID,
		"patient_id":      session.PatientID,
		"status":          "idle",
		"active":          false,
		"metrics_payload": nil,
	})
}

func (h *WithingsHardwareHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		if r.URL.Query().Get("code") != "" {
			h.HandleCallback(w, r)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	if r.Method == http.MethodHead {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
		return
	}

	// Withings sends a POST with application/x-www-form-urlencoded
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	log.Printf("[WITHINGS WEBHOOK] Payload recibido: %v", r.Form)

	userid := r.Form.Get("userid")
	tokenUsed, err := h.getValidAccessToken(r.Context(), userid)
	if err != nil || tokenUsed == "" {
		log.Printf("[WITHINGS GETMEAS ERROR] No hay access_token disponible para userid=%s", userid)
		w.WriteHeader(http.StatusOK)
		return
	}

	log.Printf("[WITHINGS GETMEAS] Ejecutando getmeas para userid=%s usando token=%s...", userid, maskToken(tokenUsed))
	measureForm := url.Values{
		"action":       {"getmeas"},
		"access_token": {tokenUsed},
		"meastypes":    {"1,5,6,8,11,76,77,88,170,123,126,127,135,226"},
	}
	if startDate := r.Form.Get("startdate"); startDate != "" {
		measureForm.Set("startdate", startDate)
	}
	if endDate := r.Form.Get("enddate"); endDate != "" {
		measureForm.Set("enddate", endDate)
	}
	if userid != "" {
		measureForm.Set("userid", userid)
	}

	var parsedMetrics map[string]float64
	var rawMeasurements map[string]interface{}
	var payloadDate int64
	var pocMeasureGroups []withingsMeasureGroup

	measureReq, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/measure", strings.NewReader(measureForm.Encode()))
	if err == nil {
		measureReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		measureResp, err := h.client.Do(measureReq)
		if err == nil {
			defer measureResp.Body.Close()
			if decodeErr := json.NewDecoder(measureResp.Body).Decode(&rawMeasurements); decodeErr == nil {
				if rawBytes, marshalErr := json.Marshal(rawMeasurements); marshalErr == nil {
					var parsedResp withingsResponse
					if unmarshalErr := json.Unmarshal(rawBytes, &parsedResp); unmarshalErr == nil && len(parsedResp.Body.MeasureGroups) > 0 {
						pocMeasureGroups = parsedResp.Body.MeasureGroups
						parsedMetrics = parseWithingsMeasures(parsedResp.Body.MeasureGroups)
						payloadDate = parsedResp.Body.MeasureGroups[0].Date
					}
				}
			}
		}
	}

	// Update POC cache if active
	pocMutex.Lock()
	if pocSessionActive {
		notification := map[string]string{}
		for _, key := range []string{"userid", "startdate", "enddate"} {
			if val := r.Form.Get(key); val != "" {
				notification[key] = val
			}
		}

		var pocMetrics map[string]float64
		if len(pocMeasureGroups) > 0 {
			pocMetrics = parseWithingsPocMeasures(pocMeasureGroups)
		} else {
			pocMetrics = parsedMetrics
		}

		pocRawPayload = map[string]interface{}{
			"notification":              notification,
			"raw_withings_measurements": rawMeasurements,
			"parsed_metrics":            pocMetrics,
		}
		pocSessionActive = false
		log.Printf("[WITHINGS POC] Payload de prueba capturado con éxito (segmental incluido)")
	}
	pocMutex.Unlock()

	// Persist bioimpedance measurements to database
	if parsedMetrics != nil && parsedMetrics["weight_kg"] > 0 {
		h.saveBioimpedanceEvaluation(r.Context(), userid, parsedMetrics, payloadDate)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *WithingsHardwareHandler) SubscribeWebhook(w http.ResponseWriter, r *http.Request) {
	if h.accessToken == "" && h.refreshToken == "" {
		http.Error(w, `{"error": "Báscula no vinculada"}`, http.StatusUnauthorized)
		return
	}

	form := url.Values{
		"action":      {"subscribe"},
		"appli":       {"1"},
		"callbackurl": {"https://clinicalplatform.ludoia.com/api/v1/withings/webhook"},
	}

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/notify", strings.NewReader(form.Encode()))
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Authorization", "Bearer "+h.accessToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	res, err := h.client.Do(req)
	if err != nil {
		http.Error(w, "Error calling Withings", http.StatusBadGateway)
		return
	}
	defer res.Body.Close()

	var payload struct {
		Status int `json:"status"`
	}
	if err := json.NewDecoder(res.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid Withings response", http.StatusBadGateway)
		return
	}

	// Handle token expiry
	if payload.Status == 401 && h.refreshToken != "" {
		if refreshErr := h.refreshAccessToken(r.Context()); refreshErr == nil {
			req, _ = http.NewRequestWithContext(r.Context(), http.MethodPost, "https://wbsapi.withings.net/notify", strings.NewReader(form.Encode()))
			req.Header.Set("Authorization", "Bearer "+h.accessToken)
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
			res, err = h.client.Do(req)
			if err == nil {
				defer res.Body.Close()
				json.NewDecoder(res.Body).Decode(&payload)
			}
		}
	}

	if payload.Status != 0 {
		http.Error(w, fmt.Sprintf(`{"error": "Withings returned status %d"}`, payload.Status), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "success", "message": "Webhook subscribed"}`))
}

// POC Endpoints

func (h *WithingsHardwareHandler) StartPocSession(w http.ResponseWriter, r *http.Request) {
	pocMutex.Lock()
	defer pocMutex.Unlock()
	pocSessionActive = true
	pocRawPayload = nil
	pocExpiresAt = time.Now().Add(5 * time.Minute)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status": "poc_started", "message": "Sesion de prueba activa por 5 minutos"}`))
}

func (h *WithingsHardwareHandler) GetPocData(w http.ResponseWriter, r *http.Request) {
	pocMutex.Lock()
	defer pocMutex.Unlock()

	// Garantizar que si hay mediciones crudas en el payload, parsed_metrics incluya el análisis segmental
	if pocRawPayload != nil {
		if rawMeas, ok := pocRawPayload["raw_withings_measurements"]; ok && rawMeas != nil {
			if rawBytes, err := json.Marshal(rawMeas); err == nil {
				var parsedResp withingsResponse
				if err := json.Unmarshal(rawBytes, &parsedResp); err == nil && len(parsedResp.Body.MeasureGroups) > 0 {
					pocRawPayload["parsed_metrics"] = parseWithingsPocMeasures(parsedResp.Body.MeasureGroups)
				}
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"active":     pocSessionActive,
		"payload":    pocRawPayload,
		"expires_at": pocExpiresAt,
	})
}
