package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                   string
	DatabaseURL            string
	SupabaseURL            string
	SupabaseAnonKey        string
	SupabaseServiceRoleKey string
	SupabaseJWTSecret      string
	CorsOrigins            string
	WithingsAccessToken    string
	WithingsUserID         string
	WithingsAPIBaseURL     string
}

func LoadConfig() *Config {
	// Load .env file if it exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	return &Config{
		Port:                   getEnv("PORT", "8080"),
		DatabaseURL:            getEnv("DATABASE_URL", ""),
		SupabaseURL:            getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:        getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
		SupabaseJWTSecret:      getEnv("SUPABASE_JWT_SECRET", ""),
		CorsOrigins:            getEnv("CORS_ORIGINS", "http://localhost:3000"),
		WithingsAccessToken:    getEnv("WITHINGS_ACCESS_TOKEN", ""),
		WithingsUserID:         getEnv("WITHINGS_USER_ID", ""),
		WithingsAPIBaseURL:     getEnv("WITHINGS_API_BASE_URL", "https://wbsapi.withings.net"),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
