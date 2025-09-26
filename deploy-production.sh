#!/bin/bash

# Production Deployment Script for LolServ
# This script deploys the tested Docker image to production

set -e  # Exit on any error

# Configuration
REGISTRY_USERNAME="your-dockerhub-username"  # Change this to your Docker Hub username

echo "🚀 LolServ Production Deployment"
echo "================================"

# Check if we're on the production server
if [ ! -d "/opt/lolserv" ]; then
    echo "❌ Error: This script should be run on the production server"
    echo "   Expected directory: /opt/lolserv"
    exit 1
fi

# Navigate to the project directory
cd /opt/lolserv

echo "📦 Pulling production Docker image..."
docker pull ${REGISTRY_USERNAME}/lolserv:latest
docker tag ${REGISTRY_USERNAME}/lolserv:latest lolserv:production

echo "🔄 Stopping existing containers..."
docker compose down || true

echo "🗄️  Starting PostgreSQL database..."
docker compose up -d postgres

echo "⏳ Waiting for database to be ready..."
sleep 10

echo "🚀 Starting LolServ application..."
docker compose up -d lolserv

echo "⏳ Waiting for application to start..."
sleep 15

echo "🧪 Testing the deployment..."
if curl -f -s http://localhost:4000/ > /dev/null; then
    echo "✅ Deployment successful!"
    echo "🌐 Application is running at: http://localhost:4000"
    echo "📊 Status:"
    curl -s http://localhost:4000/ | jq '.status'
else
    echo "❌ Deployment failed - application not responding"
    echo "📋 Container logs:"
    docker compose logs lolserv
    exit 1
fi

echo ""
echo "🎉 LolServ is now running in production!"
echo "📋 Useful commands:"
echo "   docker compose ps                    # Check container status"
echo "   docker compose logs lolserv          # View application logs"
echo "   docker compose logs postgres         # View database logs"
echo "   docker compose restart lolserv       # Restart application"
echo "   docker compose down                  # Stop all services"
