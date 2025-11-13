# M17 Merchant Management API Dockerfile
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Remove dev dependencies for production
RUN npm prune --production

# Production stage
FROM node:18-alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p logs data reports && \
    chown -R nodejs:nodejs logs data reports

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["npm", "start"]

# Labels for metadata
LABEL maintainer="Development Team <dev@company.com>"
LABEL version="1.0.0"
LABEL description="M17 Merchant Management API - REST API for restaurant operations"
LABEL org.opencontainers.image.source="https://github.com/company/m17-merchant-management"
LABEL org.opencontainers.image.documentation="https://api-docs.company.com/m17-merchant-management"
