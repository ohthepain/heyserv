#!/bin/bash

# Push LolServ to Docker Registry
# This script builds, tags, and pushes the image to Docker Hub

set -e  # Exit on any error

echo "🐳 LolServ Docker Registry Deployment"
echo "====================================="

# Configuration
REGISTRY_USERNAME="ohthepain"  # Your Docker Hub username
IMAGE_NAME="lolserv"
TAG="latest"

echo "📦 Building and pushing the Docker image for both AMD64 and ARM64 platforms..."
echo "💡 Make sure you're logged in to Docker Hub: docker login"
echo ""
docker buildx build --platform linux/amd64,linux/arm64 --push -t ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG} .

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully built and pushed to registry: ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG}"
    echo ""
    echo "🚀 On your production server, run:"
    echo "   docker pull ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG}"
    echo "   docker-compose -f compose-production.yml up -d"
else
    echo "❌ Failed to build and push image to registry"
    exit 1
fi
