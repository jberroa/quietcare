# QuietCare SPA only. API image: api/Dockerfile (separate Coolify service).
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Vite bakes these at build time. In Coolify: set as Build-time variables / Docker build args.
# VITE_API_BASE_URL = public API origin when the SPA is on a different host (no trailing slash).
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=${GEMINI_API_KEY}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY vite.config.ts ./

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
