#!/bin/bash

# Push LolServ to Docker Registry
# This script builds, tags, and pushes the image to Docker Hub

set -e  # Exit on any error

echo "🐳 LolServ Docker Registry Deployment"
echo "====================================="

# Configuration
REGISTRY_USERNAME="your-dockerhub-username"  # Change this to your Docker Hub username
IMAGE_NAME="lolserv"
TAG="latest"

echo "📦 Building the Docker image..."
docker compose build lolserv

echo "🏷️  Tagging image for registry..."
docker tag lolserv-lolserv:latest ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG}

echo "🔐 Please login to Docker Hub:"
echo "   docker login"
echo ""
echo "📤 Then push the image:"
echo "   docker push ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG}"
echo ""
echo "🚀 On your production server, pull and run:"
echo "   docker pull ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG}"
echo "   docker tag ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG} lolserv:production"
echo "   docker compose -f compose-production.yml up -d"
echo ""
echo "✅ Image ready for push: ${REGISTRY_USERNAME}/${IMAGE_NAME}:${TAG}"
