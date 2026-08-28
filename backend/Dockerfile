# Stage 1: Build the Go binary
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o bin/api ./cmd/api

# Stage 2: Minimal runtime image
FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/bin/api .
# COPY --from=builder /app/.env . # Optional: Copy .env if not injected via orchestrator

EXPOSE 8080

CMD ["./api"]
