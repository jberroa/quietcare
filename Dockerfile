# QuietCare SPA only. API image: api/Dockerfile (separate Coolify service).
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Vite bakes GEMINI_API_KEY at build time (see vite.config.ts). Set in Coolify as a
# build-time variable / Docker build arg if the client bundle needs it.
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
