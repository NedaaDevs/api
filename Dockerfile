# Use Node.js LTS version
FROM node:22-alpine AS base

# Install security updates and dumb-init for proper signal handling
RUN apk add --no-cache dumb-init && \
    apk upgrade

# Enable corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.4.0 --activate

# Create non-root user early for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Change ownership of working directory
RUN chown -R nestjs:nodejs /app

# Switch to non-root user for dependency installation
USER nestjs

# Copy package files with proper ownership
COPY --chown=nestjs:nodejs package.json yarn.lock .yarnrc.yml ./

# Install dependencies with cache optimization
RUN yarn install --immutable --check-cache

# === Build stage ===
FROM base AS builder

# Copy source code
COPY --chown=nestjs:nodejs . .

# Build the application
RUN yarn build

# Remove development dependencies to reduce image size
RUN yarn workspaces focus --production

# === Production stage ===
FROM base AS production

# Copy built application and production dependencies from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R nestjs:nodejs logs

# Create additional directories that the app might need
RUN mkdir -p tmp uploads && chown -R nestjs:nodejs tmp uploads

# Switch to non-root user
USER nestjs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port (will use PORT env var, defaulting to 3001)
EXPOSE $PORT

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]