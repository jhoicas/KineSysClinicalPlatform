package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/kinesys/clinical-platform-backend/internal/adapters/handlers"
	"github.com/kinesys/clinical-platform-backend/internal/adapters/repository/postgres"
	"github.com/kinesys/clinical-platform-backend/internal/config"
	"github.com/kinesys/clinical-platform-backend/internal/core/services"
	customMiddleware "github.com/kinesys/clinical-platform-backend/internal/middleware"
)

func main() {
	// Load Configuration
	cfg := config.LoadConfig()

	// Initialize Database Connection Pool
	ctx := context.Background()
	dbPool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	if err := dbPool.Ping(ctx); err != nil {
		log.Fatalf("Database ping failed: %v\n", err)
	}
	log.Println("Connected to PostgreSQL database successfully.")

	// Initialize Repositories
	patientRepo := postgres.NewPatientRepository(dbPool)
	encounterRepo := postgres.NewEncounterRepository(dbPool)
	anthropometryRepo := postgres.NewAnthropometryRepository(dbPool)
	nutritionRepo := postgres.NewNutritionRepository(dbPool)
	auditRepo := postgres.NewAuditRepository(dbPool)

	// Initialize Services
	patientSvc := services.NewPatientService(patientRepo)
	encounterSvc := services.NewEncounterService(encounterRepo, auditRepo)
	anthropometrySvc := services.NewAnthropometryService(anthropometryRepo)
	nutritionSvc := services.NewNutritionService(nutritionRepo)

	// Initialize Handlers
	patientHandler := handlers.NewPatientHandler(patientSvc)
	encounterHandler := handlers.NewEncounterHandler(encounterSvc)
	anthropometryHandler := handlers.NewAnthropometryHandler(anthropometrySvc)
	nutritionHandler := handlers.NewNutritionHandler(nutritionSvc)

	// Initialize Router
	r := chi.NewRouter()

	// Base Middlewares
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// CORS Configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{cfg.CorsOrigins},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Public Routes
	r.Get("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Protected Routes (Require Supabase JWT)
	r.Group(func(r chi.Router) {
		r.Use(customMiddleware.SupabaseAuth(cfg.SupabaseJWTSecret))
		
		// Patients
		r.Get("/api/v1/patients", patientHandler.List)
		r.Post("/api/v1/patients", patientHandler.Create)
		r.Get("/api/v1/patients/{id}", patientHandler.Get)

		// Encounters (SOAP)
		r.Get("/api/v1/patients/{patientId}/encounters", encounterHandler.ListByPatient)
		r.Post("/api/v1/encounters", encounterHandler.Create)

		// Anthropometry
		r.Get("/api/v1/patients/{patientId}/anthropometry", anthropometryHandler.ListByPatient)
		r.Post("/api/v1/anthropometry", anthropometryHandler.Create)

		// Nutrition
		r.Get("/api/v1/patients/{patientId}/nutrition", nutritionHandler.ListByPatient)
		r.Post("/api/v1/nutrition", nutritionHandler.Create)
	})

	// Start HTTP Server
	server := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful Shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	log.Println("Server shutting down...")
	ctxShutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctxShutdown); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited properly")
}
