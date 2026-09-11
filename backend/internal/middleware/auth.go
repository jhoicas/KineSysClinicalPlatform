package middleware

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	UserIDKey   contextKey = "user_id"
	TenantIDKey contextKey = "tenant_id"
	RoleKey     contextKey = "role"
)

func SupabaseAuth(jwtSecret string) func(http.Handler) http.Handler {
	return SupabaseAuthWithJWKS(jwtSecret, "")
}

type jwksKey struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwksDocument struct {
	Keys []jwksKey `json:"keys"`
}

type jwksCache struct {
	mu         sync.RWMutex
	keys       map[string]interface{}
	loadedAt   time.Time
	endpoint   string
	httpClient *http.Client
}

func SupabaseAuthWithJWKS(jwtSecret, supabaseURL string) func(http.Handler) http.Handler {
	cache := &jwksCache{
		keys:       make(map[string]interface{}),
		endpoint:   jwksEndpoint(supabaseURL),
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.TrimSpace(jwtSecret) == "" && cache.endpoint == "" {
				http.Error(w, "Supabase JWT secret or JWKS endpoint is not configured", http.StatusInternalServerError)
				return
			}
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
				return
			}

			tokenString := strings.TrimPrefix(authHeader, "Bearer ")

			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				if token.Method == jwt.SigningMethodHS256 {
					if strings.TrimSpace(jwtSecret) == "" {
						return nil, jwt.ErrSignatureInvalid
					}
					return []byte(jwtSecret), nil
				}
				if token.Method != jwt.SigningMethodES256 && token.Method != jwt.SigningMethodRS256 {
					return nil, fmt.Errorf("unsupported Supabase JWT algorithm: %s", token.Method.Alg())
				}
				kid, ok := token.Header["kid"].(string)
				if !ok || kid == "" {
					return nil, fmt.Errorf("Supabase JWT is missing kid header")
				}
				return cache.key(kid)
			})

			if err != nil || !token.Valid {
				http.Error(w, "Invalid token", http.StatusUnauthorized)
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				http.Error(w, "Invalid claims", http.StatusUnauthorized)
				return
			}

			// Extract Supabase User ID (sub)
			userID, _ := claims["sub"].(string)

			var tenantID, role string
			for _, claimName := range []string{"app_metadata", "user_metadata"} {
				if meta, ok := claims[claimName].(map[string]interface{}); ok {
					if tenantID == "" {
						tenantID, _ = meta["tenant_id"].(string)
					}
					if role == "" {
						role, _ = meta["role"].(string)
					}
				}
			}

			// Inject into request context
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			ctx = context.WithValue(ctx, TenantIDKey, tenantID)
			ctx = context.WithValue(ctx, RoleKey, role)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func jwksEndpoint(supabaseURL string) string {
	base := strings.TrimRight(strings.TrimSpace(supabaseURL), "/")
	if base == "" {
		return ""
	}
	base = strings.TrimSuffix(base, "/auth/v1")
	return base + "/auth/v1/.well-known/jwks.json"
}

func (c *jwksCache) key(kid string) (interface{}, error) {
	c.mu.RLock()
	key, found := c.keys[kid]
	fresh := time.Since(c.loadedAt) < 10*time.Minute
	c.mu.RUnlock()
	if found && fresh {
		return key, nil
	}
	if err := c.load(); err != nil {
		return nil, err
	}
	c.mu.RLock()
	key, found = c.keys[kid]
	c.mu.RUnlock()
	if !found {
		return nil, fmt.Errorf("Supabase JWKS does not contain kid %q", kid)
	}
	return key, nil
}

func (c *jwksCache) load() error {
	if c.endpoint == "" {
		return fmt.Errorf("Supabase JWKS endpoint is not configured")
	}
	response, err := c.httpClient.Get(c.endpoint)
	if err != nil {
		return fmt.Errorf("fetch Supabase JWKS: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch Supabase JWKS: HTTP %d", response.StatusCode)
	}
	var document jwksDocument
	if err := json.NewDecoder(response.Body).Decode(&document); err != nil {
		return fmt.Errorf("decode Supabase JWKS: %w", err)
	}
	keys := make(map[string]interface{}, len(document.Keys))
	for _, key := range document.Keys {
		parsed, err := parseJWKSKey(key)
		if err != nil {
			return fmt.Errorf("parse Supabase JWKS key %q: %w", key.Kid, err)
		}
		keys[key.Kid] = parsed
	}
	c.mu.Lock()
	c.keys = keys
	c.loadedAt = time.Now()
	c.mu.Unlock()
	return nil
}

func parseJWKSKey(key jwksKey) (interface{}, error) {
	switch key.Kty {
	case "RSA":
		n, err := decodeBase64Int(key.N)
		if err != nil {
			return nil, fmt.Errorf("invalid RSA modulus: %w", err)
		}
		e, err := decodeBase64Int(key.E)
		if err != nil {
			return nil, fmt.Errorf("invalid RSA exponent: %w", err)
		}
		return &rsa.PublicKey{N: n, E: int(e.Int64())}, nil
	case "EC":
		if key.Crv != "P-256" {
			return nil, fmt.Errorf("unsupported EC curve %q", key.Crv)
		}
		x, err := decodeBase64Int(key.X)
		if err != nil {
			return nil, err
		}
		y, err := decodeBase64Int(key.Y)
		if err != nil {
			return nil, err
		}
		return &ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}, nil
	default:
		return nil, fmt.Errorf("unsupported JWKS key type %q", key.Kty)
	}
}

func decodeBase64Int(value string) (*big.Int, error) {
	decoded, err := base64.RawURLEncoding.DecodeString(value)
	if err != nil {
		return nil, err
	}
	result := new(big.Int).SetBytes(decoded)
	if result.Sign() <= 0 {
		return nil, fmt.Errorf("empty key component")
	}
	return result, nil
}
