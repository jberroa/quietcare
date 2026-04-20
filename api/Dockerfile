# Build from repository root (so paths match Coolify monorepo):
#   docker build -f api/Dockerfile .
#
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY api/package*.json ./
RUN npm ci
COPY api/ ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY api/package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/index.js"]
