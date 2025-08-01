# Multi-stage build for NIL Pulse Backend
FROM node:18-alpine AS base

# Install system dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
FROM base AS dependencies
RUN npm install --only=production && npm cache clean --force

FROM base AS development-dependencies  
RUN npm install && npm cache clean --force

# Development stage
FROM base AS development
COPY --from=development-dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
COPY --from=development-dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production stage
FROM base AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nilpulse -u 1001

# Copy production dependencies
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code and package files
COPY --from=build --chown=nilpulse:nodejs /app/src ./src
COPY --from=build --chown=nilpulse:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p logs uploads && \
    chown -R nilpulse:nodejs logs uploads

# Switch to non-root user
USER nilpulse

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Expose port
EXPOSE 3001

# Start application
CMD ["npm", "start"]