#!/bin/bash

# Community Hero - Deployment Script
# This script automates the deployment to Firebase + Cloud Run

set -e

echo "🚀 Community Hero Deployment Script"
echo "===================================="
echo ""

# Check prerequisites
check_prerequisites() {
    echo "📋 Checking prerequisites..."

    if ! command -v gcloud &> /dev/null; then
        echo "❌ gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi

    if ! command -v docker &> /dev/null; then
        echo "❌ Docker not found. Install from: https://www.docker.com/products/docker-desktop"
        exit 1
    fi

    echo "✅ Prerequisites met"
}

# Get project configuration
setup_project() {
    echo ""
    echo "📝 Project Setup"
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
    read -p "Enter your Firebase Project ID: " FIREBASE_PROJECT_ID
    read -p "Enter your Cloud SQL instance name (default: community-hero-db): " SQL_INSTANCE
    SQL_INSTANCE=${SQL_INSTANCE:-community-hero-db}

    # Update gcloud config
    gcloud config set project $PROJECT_ID

    echo "✅ Project configured: $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
    echo ""
    echo "🔧 Enabling required Google Cloud APIs..."
    gcloud services enable \
        run.googleapis.com \
        cloudbuild.googleapis.com \
        containerregistry.googleapis.com \
        sqladmin.googleapis.com
    echo "✅ APIs enabled"
}

# Build the application
build_app() {
    echo ""
    echo "🔨 Building application..."
    npm install
    npm run build
    echo "✅ Application built"
}

# Build and push Docker image
build_docker() {
    echo ""
    echo "🐳 Building Docker image..."
    docker build -t gcr.io/$PROJECT_ID/community-hero:latest .

    echo "📤 Pushing to Container Registry..."
    docker push gcr.io/$PROJECT_ID/community-hero:latest
    echo "✅ Docker image pushed"
}

# Deploy to Cloud Run
deploy_cloudrun() {
    echo ""
    echo "☁️  Deploying to Cloud Run..."

    read -p "Enter your database URL (or press Enter to skip): " DATABASE_URL
    read -p "Enter your Gemini API key (or press Enter to skip): " GEMINI_API_KEY

    ENV_VARS="NODE_ENV=production,PORT=8080"
    if [ ! -z "$DATABASE_URL" ]; then
        ENV_VARS="$ENV_VARS,DATABASE_URL=$DATABASE_URL"
    fi
    if [ ! -z "$GEMINI_API_KEY" ]; then
        ENV_VARS="$ENV_VARS,GEMINI_API_KEY=$GEMINI_API_KEY"
    fi

    gcloud run deploy community-hero-backend \
        --image=gcr.io/$PROJECT_ID/community-hero:latest \
        --platform=managed \
        --region=us-central1 \
        --allow-unauthenticated \
        --memory=512Mi \
        --cpu=1 \
        --set-env-vars=$ENV_VARS

    echo "✅ Deployed to Cloud Run"
}

# Get deployment URL
show_deployment_url() {
    echo ""
    echo "🎉 Deployment Complete!"
    echo "===================================="

    URL=$(gcloud run services describe community-hero-backend \
        --platform=managed \
        --region=us-central1 \
        --format='value(status.url)')

    echo "Your hackathon submission link:"
    echo "🔗 $URL"
    echo ""
    echo "Share this link with your hackathon judges!"
}

# Main execution
main() {
    check_prerequisites
    setup_project
    enable_apis
    build_app
    build_docker

    read -p "Do you want to deploy to Cloud Run now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_cloudrun
        show_deployment_url
    else
        echo "⏭️  Skipping Cloud Run deployment"
        echo "To deploy manually, run:"
        echo "  gcloud run deploy community-hero-backend \\"
        echo "    --image=gcr.io/$PROJECT_ID/community-hero:latest \\"
        echo "    --platform=managed --region=us-central1 --allow-unauthenticated"
    fi
}

main
