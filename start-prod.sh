#!/bin/bash

# CalcpadS3 Production Startup Script
# This script starts the production environment

set -e  # Exit on any error

echo "🚀 Starting CalcpadS3 Production Environment..."
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    exit 1
fi

# Set production environment
export NODE_ENV=production

echo "📦 Building and starting production containers..."
echo "   - API Server: http://localhost:5000"
echo "   - MinIO API: http://localhost:9000"
echo "   - MinIO Console: http://localhost:9001"
echo "   - Web Viewer: http://localhost:3000"
echo ""

# Start with build flag for production
docker compose --env-file .env.production up --build -d

echo ""
echo "✅ Production environment started in background."
echo "📊 To view logs: docker compose logs -f"
echo "🛑 To stop: docker compose down"