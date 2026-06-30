# Deployment Guide: Firebase + Cloud Run

This guide will help you deploy Community Hero to Firebase Hosting (frontend) with Cloud Run (backend).

## Architecture

```
GitHub Repository
    ↓
Cloud Build (CI/CD)
    ↓
    ├→ Build Docker Image
    ├→ Push to Container Registry
    └→ Deploy to Cloud Run
         ↓
    Community Hero Backend Service
    (Serves both API + Frontend)
         ↓
    Cloud SQL (PostgreSQL)
```

## Prerequisites

1. **Google Cloud Account** - [Create one here](https://cloud.google.com/)
2. **Firebase Project** - [Create one here](https://console.firebase.google.com/)
3. **gcloud CLI** - [Install here](https://cloud.google.com/sdk/docs/install)
4. **GitHub Account** - [Already created](https://github.com/sai-phaneesh/Community-Hero)

## Setup Steps

### Step 1: Create Firebase Project

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Create .firebaserc file (or use the one provided)
cat > .firebaserc << EOF
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
EOF
```

### Step 2: Set Up Google Cloud Project

```bash
# Install and initialize gcloud CLI
gcloud init

# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  sqladmin.googleapis.com \
  cloudfunctions.googleapis.com
```

### Step 3: Set Up Cloud SQL (PostgreSQL)

```bash
# Create Cloud SQL instance
gcloud sql instances create community-hero-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --backup

# Create database
gcloud sql databases create community_hero \
  --instance=community-hero-db

# Create database user
gcloud sql users create db_user \
  --instance=community-hero-db \
  --password=YOUR_SECURE_PASSWORD
```

**Important**: Save the connection string:
```
postgresql://db_user:YOUR_SECURE_PASSWORD@/community_hero?host=/cloudsql/PROJECT_ID:us-central1:community-hero-db
```

### Step 4: Configure Environment Variables

Create a `.env.production` file in Cloud Run:

```bash
gcloud run services update community-hero-backend \
  --set-env-vars=DATABASE_URL="postgresql://db_user:password@/community_hero?host=/cloudsql/PROJECT_ID:us-central1:community-hero-db",\
GEMINI_API_KEY="your-gemini-api-key",\
NODE_ENV="production",\
PORT="8080"
```

Or use Cloud Secret Manager (recommended for sensitive data):

```bash
# Create secrets
echo -n "your-database-url" | gcloud secrets create DATABASE_URL --data-file=-
echo -n "your-gemini-api-key" | gcloud secrets create GEMINI_API_KEY --data-file=-

# Grant Cloud Run access to secrets
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:PROJECT_ID@appspot.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Step 5: Set Up Cloud Build (CI/CD)

Connect GitHub to Cloud Build:

```bash
# Create Cloud Build trigger
gcloud builds connect --repository-name=Community-Hero \
  --repository-owner=sai-phaneesh \
  --region=us-central1
```

Or manually via Cloud Console:
1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click "Create Trigger"
3. Connect your GitHub repository
4. Select `cloudbuild.yaml` as the build config file
5. Click Create

### Step 6: Build & Deploy

#### Option A: Manual Deployment (for testing)

```bash
# Build the application
npm run build

# Build and push Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/community-hero:latest .
docker push gcr.io/YOUR_PROJECT_ID/community-hero:latest

# Deploy to Cloud Run
gcloud run deploy community-hero-backend \
  --image=gcr.io/YOUR_PROJECT_ID/community-hero:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --set-cloudsql-instances=PROJECT_ID:us-central1:community-hero-db \
  --set-env-vars=DATABASE_URL="postgresql://db_user:password@/community_hero?host=/cloudsql/PROJECT_ID:us-central1:community-hero-db",\
GEMINI_API_KEY="your-key",\
NODE_ENV="production"
```

#### Option B: Automated Deployment (recommended)

Push to GitHub and Cloud Build will automatically:
1. Build your Docker image
2. Push to Container Registry
3. Deploy to Cloud Run

```bash
git add Dockerfile cloudbuild.yaml
git commit -m "Add Docker and Cloud Build configuration"
git push origin main
```

### Step 7: Get Your Deployment URL

After successful deployment:

```bash
# Get Cloud Run service URL
gcloud run services describe community-hero-backend \
  --platform=managed \
  --region=us-central1 \
  --format='value(status.url)'
```

Your hackathon submission link will be something like:
```
https://community-hero-backend-xxxxx-uc.a.run.app
```

## Database Migrations

If you need to run database migrations after deployment:

```bash
# Connect to Cloud SQL proxy
cloud_sql_proxy -instances=PROJECT_ID:us-central1:community-hero-db -dir=/cloudsql &

# Run migrations (if you have migration scripts)
psql "postgresql://db_user:password@/community_hero?host=/cloudsql/PROJECT_ID:us-central1:community-hero-db" < migrations.sql
```

## Monitoring & Logs

```bash
# View Cloud Run logs
gcloud run services logs read community-hero-backend \
  --platform=managed \
  --region=us-central1 \
  --limit=100

# View build logs
gcloud builds log --stream LATEST

# Monitor performance
# Go to: https://console.cloud.google.com/run/detail/us-central1/community-hero-backend/metrics
```

## Troubleshooting

### Port Issues
- Cloud Run expects the app to listen on the `PORT` environment variable (default 8080)
- Ensure your `server.ts` uses: `const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;`

### Database Connection
- Use Cloud SQL Proxy socket for secure connections
- Connection string format: `postgresql://user:password@/database?host=/cloudsql/PROJECT_ID:REGION:INSTANCE`

### Build Failures
```bash
# Check build logs
gcloud builds log LATEST --stream

# Local test
docker build -t community-hero:test .
docker run -p 8080:8080 community-hero:test
```

### CORS Issues
- Ensure `origin` in CORS config matches your deployment URL
- Update in `server.ts` if needed

## Cost Optimization

- **Cloud Run**: Pay only for actual usage (~$0.10/100k requests)
- **Cloud SQL**: Start with `db-f1-micro` tier (~$13/month)
- **Cloud Build**: Free tier includes 120 build-minutes/day
- **Container Registry**: ~$0.10 per GB stored

## Scaling

To handle more traffic:

```bash
# Increase max concurrency and instances
gcloud run services update community-hero-backend \
  --region=us-central1 \
  --concurrency=100 \
  --min-instances=1 \
  --max-instances=10
```

## Next Steps

1. ✅ Create Firebase project
2. ✅ Set up Cloud SQL
3. ✅ Deploy via Cloud Build
4. 📊 Monitor with Cloud Logging
5. 🔒 Set up Cloud Armor for DDoS protection
6. 🚀 Scale based on traffic

For more help:
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Firebase Hosting Documentation](https://firebase.google.com/docs/hosting)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
