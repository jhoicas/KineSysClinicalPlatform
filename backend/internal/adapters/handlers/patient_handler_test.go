package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/kinesys/clinical-platform-backend/internal/core/domain"
	"github.com/kinesys/clinical-platform-backend/internal/core/ports"
	"github.com/kinesys/clinical-platform-backend/internal/middleware"
)

type fakePatientService struct {
	ports.PatientService
	gotID       uuid.UUID
	gotTenantID uuid.UUID
	gotFields   map[string]any
	result      *domain.Patient
	err         error
}

func (f *fakePatientService) PatchPatient(_ context.Context, id, tenantID uuid.UUID, fields map[string]any) (*domain.Patient, error) {
	f.gotID, f.gotTenantID, f.gotFields = id, tenantID, fields
	return f.result, f.err
}

func newPatchRequest(t *testing.T, id, tenantID, body string) *http.Request {
	t.Helper()
	req := httptest.NewRequest(http.MethodPatch, "/api/v1/patients/"+id, strings.NewReader(body))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add("id", id)
	ctx := context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx)
	ctx = context.WithValue(ctx, middleware.TenantIDKey, tenantID)
	return req.WithContext(ctx)
}

func TestPatientHandlerPatch(t *testing.T) {
	patientID, tenantID := uuid.New(), uuid.New()
	height := 175.0

	tests := []struct {
		name       string
		id         string
		tenant     string
		body       string
		svc        *fakePatientService
		wantStatus int
	}{
		{
			name:       "success",
			id:         patientID.String(),
			tenant:     tenantID.String(),
			body:       `{"height_cm":175}`,
			svc:        &fakePatientService{result: &domain.Patient{ID: patientID, TenantID: tenantID, FullName: "Ana", HeightCm: &height}},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid tenant context",
			id:         patientID.String(),
			tenant:     "",
			body:       `{"height_cm":175}`,
			svc:        &fakePatientService{},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "invalid patient id",
			id:         "not-a-uuid",
			tenant:     tenantID.String(),
			body:       `{"height_cm":175}`,
			svc:        &fakePatientService{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "malformed json",
			id:         patientID.String(),
			tenant:     tenantID.String(),
			body:       `{"height_cm":`,
			svc:        &fakePatientService{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid patch",
			id:         patientID.String(),
			tenant:     tenantID.String(),
			body:       `{"height_cm":999}`,
			svc:        &fakePatientService{err: domain.ErrInvalidPatientPatch},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "patient not found",
			id:         patientID.String(),
			tenant:     tenantID.String(),
			body:       `{"height_cm":175}`,
			svc:        &fakePatientService{err: domain.ErrPatientNotFound},
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "unexpected error is not leaked",
			id:         patientID.String(),
			tenant:     tenantID.String(),
			body:       `{"height_cm":175}`,
			svc:        &fakePatientService{err: context.DeadlineExceeded},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			NewPatientHandler(tt.svc).Patch(rec, newPatchRequest(t, tt.id, tt.tenant, tt.body))

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantStatus == http.StatusInternalServerError && strings.Contains(rec.Body.String(), "deadline") {
				t.Fatalf("internal error leaked to client: %s", rec.Body.String())
			}
		})
	}

	t.Run("passes tenant and fields to the service", func(t *testing.T) {
		svc := &fakePatientService{result: &domain.Patient{ID: patientID, TenantID: tenantID, FullName: "Ana"}}
		rec := httptest.NewRecorder()
		NewPatientHandler(svc).Patch(rec, newPatchRequest(t, patientID.String(), tenantID.String(), `{"height_cm":175,"phone":null}`))

		if svc.gotID != patientID || svc.gotTenantID != tenantID {
			t.Fatalf("service got id=%s tenant=%s", svc.gotID, svc.gotTenantID)
		}
		if svc.gotFields["height_cm"] != 175.0 {
			t.Fatalf("height_cm = %v", svc.gotFields["height_cm"])
		}
		if v, ok := svc.gotFields["phone"]; !ok || v != nil {
			t.Fatalf("explicit null must reach the service to clear the column, got %v (present=%v)", v, ok)
		}
	})
}
