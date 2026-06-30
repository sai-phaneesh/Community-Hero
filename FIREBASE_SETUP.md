# Firebase Setup Guide - Quick Start

This guide will get you set up with Firebase in 15 minutes.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `community-hero` (or similar)
4. Click **Continue**
5. Disable Google Analytics (optional, you can enable later)
6. Click **Create project**
7. Wait for project creation to complete

## Step 2: Create Google Cloud Project (if not already done)

Your Firebase project automatically creates a Google Cloud Project. You need the **Project ID**.

1. In Firebase Console, go to **Project Settings** (gear icon, top right)
2. Copy your **Project ID** (you'll need this later)
3. Example: `community-hero-abc123`

## Step 3: Install Firebase CLI

```bash
# Install Firebase tools globally
npm install -g firebase-tools

# Or using pnpm
pnpm add -g firebase-tools

# Verify installation
firebase --version
```

## Step 4: Authenticate with Firebase

```bash
# Login to Firebase (opens browser)
firebase login

# If you're in headless environment (SSH/server):
firebase login --no-localhost
```

## Step 5: Initialize Firebase in Your Project

```bash
cd /Users/saiphaneesh/antigravity/Community-Hero

# Initialize Firebase
firebase init

# You'll be asked several questions:
# ? Which Firebase features do you want to set up for this directory?
#   ✔ Hosting: Configure files for Firebase Hosting and (optionally) set up GitHub Actions deploys
#   ✔ Functions: Configure a Cloud Functions directory and its files
#   (Just select Hosting for now)
#
# ? What do you want to use as your public directory?
#   dist (this is where Vite builds your frontend)
#
# ? Configure as a single-page app (rewrite all urls to /index.html)?
#   y (yes, since you're using React Router)
#
# ? Set up automatic builds and deploys with GitHub?
#   n (we'll do this with Cloud Build instead)
```

## Step 6: Create `.firebaserc` File

Create `.firebaserc` in your project root:

```bash
cat > .firebaserc << 'EOF'
{
  "projects": {
    "default": "your-project-id-here"
  }
}
EOF
```

**Replace `your-project-id-here`** with your actual Firebase Project ID (from Step 2).

Example:
```json
{
  "projects": {
    "default": "community-hero-abc123"
  }
}
EOF
```

## Step 7: Update `firebase.json`

Replace your `firebase.json` with this (already provided):

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

## Step 8: Build and Test Locally

```bash
# Build your frontend
npm run build

# Test locally (simulates Firebase Hosting)
firebase serve

# You should see:
# ✔  hosting: Local server started at http://localhost:5000
```

Visit http://localhost:5000 to verify your app works.

## Step 9: Deploy Frontend to Firebase Hosting

```bash
# Deploy your frontend
firebase deploy --only hosting

# You should see:
# ✔  Deploy complete!
# 
# Project Console: https://console.firebase.google.com/project/your-project-id/hosting/main
# Hosting URL: https://your-project-id.web.app
```

**Your frontend is now live!** 🎉

Frontend URL: `https://your-project-id.web.app`

## Step 10: Enable Google Cloud APIs

Now we need to enable APIs for Cloud Run and Cloud SQL:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure your Firebase project is selected (dropdown at top)
3. Search for **"APIs & Services"** → **Enable APIs**
4. Enable these APIs:
   - **Cloud Run API**
   - **Cloud Build API**
   - **Cloud SQL Admin API**
   - **Secret Manager API** (for credentials)

## Step 11: Set Up Cloud SQL (Database)

```bash
# Install gcloud CLI if not done already
# https://cloud.google.com/sdk/docs/install

gcloud init
# Select your Firebase project

# Create Cloud SQL instance
gcloud sql instances create community-hero-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create community_hero \
  --instance=community-hero-db

# Create user and password
gcloud sql users create dbuser \
  --instance=community-hero-db \
  --password

# You'll be prompted to enter a password - save this securely
```

**Important**: Save your connection details:
- Instance name: `community-hero-db`
- Database: `community_hero`
- User: `dbuser`
- Region: `us-central1`

## Step 12: Deploy Backend to Cloud Run

```bash
# Build Docker image
docker build -t gcr.io/your-project-id/community-hero:latest .

# Push to Google Container Registry
docker push gcr.io/your-project-id/community-hero:latest

# Deploy to Cloud Run
gcloud run deploy community-hero-backend \
  --image=gcr.io/your-project-id/community-hero:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --memory=512Mi \
  --set-cloudsql-instances=your-project-id:us-central1:community-hero-db \
  --set-env-vars=DATABASE_URL="postgresql://dbuser:password@/community_hero?host=/cloudsql/your-project-id:us-central1:community-hero-db",NODE_ENV=production

# After deployment, you'll get a URL:
# Service URL: https://community-hero-backend-xxxxx-uc.a.run.app
```

## Step 13: Connect Frontend to Backend

Update your frontend to point to your Cloud Run backend:

In your frontend code (e.g., `src/frontend/trpc.ts`), update the API URL:

```typescript
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: process.env.NODE_ENV === "production"
        ? "https://community-hero-backend-xxxxx-uc.a.run.app/trpc"
        : "http://localhost:5001/trpc",
    }),
  ],
});
```

Then redeploy:
```bash
npm run build
firebase deploy --only hosting
```

## Step 14: Get Your Hackathon Submission Link

You now have **TWO URLs**:

1. **Frontend**: `https://your-project-id.web.app`
2. **Backend**: `https://community-hero-backend-xxxxx-uc.a.run.app`

**For hackathon, use the frontend URL!** ✨

## Troubleshooting

### Issue: `firebase login` not working
```bash
# Try:
firebase login --no-localhost
# Then paste the token when prompted
```

### Issue: Docker build failing
```bash
# Make sure you're in the project directory
cd /Users/saiphaneesh/antigravity/Community-Hero

# Clear Docker cache
docker system prune -a

# Try building again
docker build -t gcr.io/your-project-id/community-hero:latest .
```

### Issue: Database connection failing
```bash
# Test connection locally using Cloud SQL Proxy:
# Install: https://cloud.google.com/sql/docs/postgres/cloud-sql-proxy

cloud_sql_proxy -instances=your-project-id:us-central1:community-hero-db

# In another terminal:
psql "postgresql://dbuser:password@/community_hero?host=/cloudsql/..."
```

## Next Steps

1. ✅ Create Firebase project
2. ✅ Install Firebase CLI
3. ✅ Initialize Firebase
4. ✅ Deploy frontend
5. ✅ Set up Cloud SQL
6. ✅ Deploy backend
7. 📊 Monitor at [Google Cloud Console](https://console.cloud.google.com/)
8. 🔒 Set up domain (optional)

## Quick Commands Reference

```bash
# Deploy everything
npm run build
firebase deploy --only hosting
docker build -t gcr.io/PROJECT_ID/community-hero:latest .
docker push gcr.io/PROJECT_ID/community-hero:latest

# View logs
firebase hosting:channel:list
gcloud run logs read community-hero-backend --region us-central1 --limit 50

# Delete project (if needed)
firebase projects:list
# gcloud projects delete PROJECT_ID
```

Need help? Check:
- [Firebase Docs](https://firebase.google.com/docs)
- [Cloud Run Docs](https://cloud.google.com/run/docs)
- [Cloud SQL Docs](https://cloud.google.com/sql/docs)
