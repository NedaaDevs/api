# Use Node.js LTS version
FROM node:22-alpine

# Enable corepack and set Yarn version
RUN corepack enable && corepack prepare yarn@4.4.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock .yarnrc.yml ./

# Install dependencies
RUN yarn install --immutable

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port (default NestJS port)
EXPOSE 3001

# Start the application
CMD ["node", "dist/main"]
