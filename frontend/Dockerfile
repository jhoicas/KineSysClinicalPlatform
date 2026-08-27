# ─── KineSys Frontend — Multi-stage Docker Build ─────────────────────────────
# Stage 1: Build the React + Vite application
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve with lightweight nginx
FROM nginx:alpine AS production

# Copy custom nginx config for SPA routing
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:8080; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
    } \
}' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
