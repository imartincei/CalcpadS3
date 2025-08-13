FROM node:22-alpine

# Build argument to determine environment
ARG NODE_ENV=production

WORKDIR /app

# Install sqlite for development
RUN if [ "$NODE_ENV" = "development" ]; then apk add --no-cache sqlite; fi

# Copy package files
COPY package*.json ./

# Install dependencies based on environment
RUN if [ "$NODE_ENV" = "development" ]; then \
        npm ci; \
    else \
        npm ci --only=production && \
        npm install typescript tsx -g; \
    fi

# Copy source code
COPY . .

# Build the application for production
RUN if [ "$NODE_ENV" = "production" ]; then \
        npm run build && \
        npm prune --production; \
    fi

# Create data directory
RUN mkdir -p /app/data

# Expose port and debug port (debug port only used in development)
EXPOSE 5000
EXPOSE 9229

# Set environment variables
ENV NODE_ENV=$NODE_ENV
ENV PORT=5000

# Start the application based on environment
CMD if [ "$NODE_ENV" = "development" ]; then \
        npm run dev; \
    else \
        npm start; \
    fi