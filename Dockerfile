# Multi-stage build for deepresearch-mcp-server

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm ci --include=dev

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Stage 2: Runtime stage
FROM node:20-alpine AS runtime

# Create non-root user
RUN addgroup -g 1001 -S deepresearch && \
    adduser -S deepresearch -u 1001

# Set working directory
WORKDIR /app

# Copy built application and production dependencies from builder
COPY --from=builder --chown=deepresearch:deepresearch /app/dist ./dist
COPY --from=builder --chown=deepresearch:deepresearch /app/node_modules ./node_modules
COPY --from=builder --chown=deepresearch:deepresearch /app/package*.json ./

# Create directories for logs and backups
RUN mkdir -p /app/logs /app/atlas-backups && \
    chown -R deepresearch:deepresearch /app/logs /app/atlas-backups

# Install runtime dependencies
RUN apk add --no-cache curl

# Switch to non-root user
USER deepresearch

# Expose port (adjust if needed)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Environment variables with defaults
ENV NODE_ENV=production \
    LOG_LEVEL=info \
    NEO4J_URI=bolt://neo4j:7687 \
    NEO4J_USER=neo4j \
    NEO4J_PASSWORD=password \
    BACKUP_FILE_DIR=/app/atlas-backups \
    BACKUP_MAX_COUNT=15

# Start the application
CMD ["node", "dist/index.js"]