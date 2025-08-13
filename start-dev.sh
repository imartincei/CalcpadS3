#!/bin/bash

# CalcpadS3 Development Startup Script
# This script starts the development environment with hot reload and debugging

set -e  # Exit on any error

echo "🚀 Starting CalcpadS3 Development Environment..."
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

# Set development environment
export NODE_ENV=development

echo "📦 Building and starting development containers..."
echo "   - API Server: http://localhost:5000"
echo "   - Debug Port: localhost:9229"
echo "   - MinIO API: http://localhost:9000"
echo "   - MinIO Console: http://localhost:9001"
echo "   - Web Viewer: http://localhost:3000"
echo ""

# Start with build flag to ensure latest changes
docker compose --env-file .env.development up --build

echo ""
echo "🛑 Development environment stopped."