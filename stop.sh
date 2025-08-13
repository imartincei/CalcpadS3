#!/bin/bash

# CalcpadS3 Stop Script
# This script stops all CalcpadS3 containers and optionally removes volumes

set -e  # Exit on any error

echo "🛑 Stopping CalcpadS3..."

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running."
    exit 1
fi

# Stop containers
echo "📦 Stopping containers..."
docker compose down

# Ask if user wants to remove volumes (data)
echo ""
read -p "❓ Do you want to remove all data (volumes)? This will delete all files and database data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️  Removing volumes..."
    docker compose down -v
    echo "✅ All data removed."
else
    echo "💾 Data preserved in volumes."
fi

echo ""
echo "✅ CalcpadS3 stopped."