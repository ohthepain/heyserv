#!/bin/bash

# Production Deployment Script for LolServ
# This script deploys the tested Docker image to production

set -e  # Exit on any error

# Configuration
REGISTRY_USERNAME="ohthepain"  # Your Docker Hub username

echo "🚀 LolServ Production Deployment"
echo "================================"

# Check if we're in a git repository with the right files
if [ ! -f "compose-production.yml" ] || [ ! -f "deploy-production.sh" ]; then
    echo "❌ Error: This script should be run from the project root directory"
    echo "   Expected files: compose-production.yml, deploy-production.sh"
    echo "   Current directory: $(pwd)"
    echo ""
    echo "💡 To deploy:"
    echo "   1. Clone the repository: git clone <your-repo-url>"
    echo "   2. cd into the project directory"
    echo "   3. Copy your .env file to the project root"
    echo "   4. Run: ./deploy-production.sh"
    exit 1
fi

echo "📁 Running from: $(pwd)"

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
