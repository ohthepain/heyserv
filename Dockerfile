# Use Node.js 20 LTS Alpine for smaller image size
FROM --platform=linux/amd64 node:20-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for building
RUN apk add --no-cache \
    curl \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src ./src/
COPY tsconfig.json ./

# Show what we're about to build
RUN echo "Source files:" && find src -name "*.ts" | head -10
RUN echo "TypeScript config:" && cat tsconfig.json

# Build the application
RUN echo "Starting TypeScript build..." && npm run build
RUN echo "Build completed, checking output..."

# Verify the build was successful
RUN echo "Contents of dist directory:" && ls -la dist/
RUN echo "Checking for mcpServer.js:" && ls -la dist/mcpServer.js
RUN echo "File size of mcpServer.js:" && wc -l dist/mcpServer.js

# Remove dev dependencies after build
RUN npm prune --production

# Final verification that the built files still exist
RUN echo "Final verification - checking dist directory after npm prune:" && ls -la dist/
RUN echo "Final verification - checking mcpServer.js exists:" && test -f dist/mcpServer.js && echo "mcpServer.js exists" || echo "mcpServer.js missing!"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S lolserv -u 1001 -G nodejs

# Change ownership of the app directory
RUN chown -R lolserv:nodejs /app
USER lolserv

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4000/ || exit 1

# Start the application
CMD ["npm", "start"]
