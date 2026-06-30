# 🚀 Deployment Checklist for Hackathon

Use this checklist to deploy your Community Hero app in the right order.

## Phase 1: Setup Firebase & Google Cloud (15 minutes)

- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Click "Add project" → Create new Firebase project
- [ ] Project name: `community-hero` (or your preferred name)
- [ ] Disable Google Analytics
- [ ] Wait for project to create
- [ ] Go to Project Settings (gear icon) → Copy your **Project ID**
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Login: `firebase login`

## Phase 2: Setup Local Environment (10 minutes)

- [ ] Run `firebase init` in your project directory
  - [ ] Select "Hosting"
  - [ ] Public directory: `dist`
  - [ ] Configure as SPA: `y`
  - [ ] Skip GitHub setup: `n`
- [ ] Create `.firebaserc` file with your project ID:
  ```json
  {
    "projects": {
      "default": "your-project-id-here"
    }
  }
  ```
- [ ] Verify `.gitignore` has `.env*` (check: `cat .gitignore`)

## Phase 3: Frontend Deployment (5 minutes)

- [ ] Build frontend:
  ```bash
  npm install
  npm run build
  ```
- [ ] Test locally:
  ```bash
  firebase serve
  ```
  - [ ] Open http://localhost:5000
  - [ ] Verify app works
- [ ] Deploy to Firebase Hosting:
  ```bash
  firebase deploy --only hosting
  ```
- [ ] Note your **Frontend URL**: `https://your-project-id.web.app`

## Phase 4: Backend Setup (Optional but Recommended)

If you want your backend hosted too:

- [ ] Install gcloud CLI: [instructions](https://cloud.google.com/sdk/docs/install)
- [ ] Run `gcloud init` and select your Firebase project
- [ ] Enable APIs:
  ```bash
  gcloud services enable \
    run.googleapis.com \
    cloudbuild.googleapis.com \
    containerregistry.googleapis.com \
    sqladmin.googleapis.com
  ```

### Option A: Cloud SQL + Cloud Run (Recommended)

- [ ] Create Cloud SQL database:
  ```bash
  gcloud sql instances create community-hero-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1
  ```
- [ ] Create database:
  ```bash
  gcloud sql databases create community_hero \
    --instance=community-hero-db
  ```
- [ ] Create user:
  ```bash
  gcloud sql users create dbuser \
    --instance=community-hero-db \
    --password
  ```
- [ ] Save your database URL:
  ```
  postgresql://dbuser:PASSWORD@/community_hero?host=/cloudsql/PROJECT_ID:us-central1:community-hero-db
  ```

### Option B: Simple Backend Deployment (No Database)

Skip the Cloud SQL setup and just deploy the backend server.

- [ ] Build Docker image:
  ```bash
  docker build -t gcr.io/YOUR_PROJECT_ID/community-hero:latest .
  ```
- [ ] Push to registry:
  ```bash
  docker push gcr.io/YOUR_PROJECT_ID/community-hero:latest
  ```
- [ ] Deploy to Cloud Run:
  ```bash
  gcloud run deploy community-hero-backend \
    --image=gcr.io/YOUR_PROJECT_ID/community-hero:latest \
    --platform=managed \
    --region=us-central1 \
    --allow-unauthenticated \
    --memory=512Mi
  ```
- [ ] Note your **Backend URL**: `https://community-hero-backend-xxxxx-uc.a.run.app`

## Phase 5: Connect Frontend to Backend (If deployed)

If you deployed the backend:

- [ ] Find backend URL:
  ```bash
  gcloud run services describe community-hero-backend \
    --platform=managed \
    --region=us-central1 \
    --format='value(status.url)'
  ```
- [ ] Update your frontend to use this URL (in API client config)
- [ ] Rebuild and redeploy:
  ```bash
  npm run build
  firebase deploy --only hosting
  ```

## Phase 6: Security Check ✅

- [ ] Run: `git status` and verify `.env` is **NOT** listed
- [ ] Run: `git ls-files | grep "\.env"` - should return nothing
- [ ] Verify `.gitignore` contains:
  ```
  .env
  .env*
  !.env.example
  service-account*.json
  credentials*.json
  ```
- [ ] Check `.env.example` only has placeholder values, no real secrets

## Phase 7: Push to GitHub

- [ ] Add files:
  ```bash
  git add .
  ```
- [ ] Commit:
  ```bash
  git commit -m "Add Firebase and deployment configuration"
  ```
- [ ] Push:
  ```bash
  git push origin main
  ```

## Phase 8: Hackathon Submission 🎉

### Your Deployment Link:
```
Frontend: https://your-project-id.web.app
Backend (if deployed): https://community-hero-backend-xxxxx-uc.a.run.app
GitHub: https://github.com/sai-phaneesh/Community-Hero
```

### Submit:
- [ ] Share **Frontend URL** with judges
- [ ] Make sure README has setup instructions
- [ ] Verify app works from the shared URL
- [ ] Test on mobile and desktop

## Quick Reference: File Locations

```
/Users/saiphaneesh/antigravity/Community-Hero/
├── .env                          ← LOCAL ONLY, never commit
├── .env.example                  ← Safe to commit (no real values)
├── .gitignore                    ← Already has protections
├── .firebaserc                   ← Safe to commit (project ID only)
├── firebase.json                 ← Safe to commit
├── Dockerfile                    ← For Cloud Run deployment
├── cloudbuild.yaml               ← For CI/CD
├── FIREBASE_SETUP.md             ← Step-by-step guide
├── DEPLOYMENT.md                 ← Detailed deployment guide
├── SECURITY_CREDENTIALS.md       ← What to keep secret
└── DEPLOYMENT_CHECKLIST.md       ← This file
```

## Troubleshooting

### Firebase Hosting URL not working
```bash
firebase deploy --only hosting
firebase open hosting:site
```

### Can't login to Firebase
```bash
firebase logout
firebase login --no-localhost
```

### Docker build fails
```bash
docker system prune -a
docker build -t gcr.io/YOUR_PROJECT_ID/community-hero:latest .
```

### Cloud Run deployment fails
```bash
# View logs
gcloud run logs read community-hero-backend --region us-central1 --limit 50

# Check image exists
gcloud container images list
```

## Estimated Costs (for your budget)

| Service | Cost | Notes |
|---------|------|-------|
| Firebase Hosting | ~$1/month | Static files only |
| Cloud Run | ~$0 first month | Pay for usage (free tier: 2M requests/month) |
| Cloud SQL | ~$13/month | db-f1-micro tier |
| **Total** | **~$14/month** | Scale up if needed |

## After Hackathon: Next Steps

- [ ] Monitor logs: `firebase deploy --only hosting`
- [ ] Set custom domain (optional)
- [ ] Enable authentication
- [ ] Set up automated backups
- [ ] Enable Cloud Armor for DDoS protection

---

## Need Help?

- **Firebase Issues**: [Firebase Docs](https://firebase.google.com/docs)
- **Cloud Run Issues**: [Cloud Run Docs](https://cloud.google.com/run/docs)
- **Deployment Issues**: See `DEPLOYMENT.md`
- **Security Issues**: See `SECURITY_CREDENTIALS.md`

---

**Estimated Total Time**: 30-45 minutes for complete setup
**Recommended**: Start with Phase 1-3 for frontend only, then add backend if time permits
