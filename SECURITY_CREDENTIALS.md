# Security & Credentials Reference

This document lists all sensitive credentials and what should **NEVER** be committed to Git.

## ✅ Already Protected in .gitignore

Your `.gitignore` already prevents these from being committed:

```
# Environment files (contain all secrets)
.env              ← Don't commit
.env.local        ← Don't commit
.env.*.local      ← Don't commit
!.env.example     ← DO commit (template only)

# Google Cloud credentials
service-account*.json     ← Don't commit
credentials*.json         ← Don't commit
google-services.json      ← Don't commit

# Firebase credentials
.firebaserc               ← Okay to commit (only has project ID)
firebase-debug.log       ← Don't commit

# Database files
db.json          ← Don't commit (local development)
*.db             ← Don't commit
*.sqlite         ← Don't commit

# File uploads (local)
public/uploads/  ← Don't commit
uploads/         ← Don't commit
```

## 🔐 Sensitive Credentials - Keep Secret!

### 1. Database Credentials
```
DATABASE_URL="postgresql://dbuser:YOUR_PASSWORD@/community_hero?host=/cloudsql/project-id:region:instance"
```
- **What**: PostgreSQL connection string
- **Where**: `.env` file (local) or Cloud Run environment variables
- **Who needs it**: Backend server only
- **How to share**: Use Google Cloud Secret Manager, NOT in code

### 2. API Keys
```
GEMINI_API_KEY="AIzaSyD..." (45+ characters)
```
- **What**: Google Gemini AI API key
- **Where**: `.env` file or Cloud Run secrets
- **Who needs it**: Backend server only
- **Danger**: Anyone with this key can make API calls and drain your quota
- **How to share**: Use Cloud Secret Manager

### 3. Firebase Config (Frontend is okay to expose)
```json
{
  "apiKey": "AIzaSy...",
  "authDomain": "project.firebaseapp.com",
  "projectId": "project-id",
  "storageBucket": "project.appspot.com",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abc123"
}
```
- **What**: Firebase configuration
- **Status**: ✅ **SAFE TO COMMIT** - these are public
- **Why**: Frontend needs them to authenticate users
- **Where**: Can be in code or `.env.example`

### 4. Google Cloud Service Account Key
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "...@iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "..."
}
```
- **What**: Grants full access to your Google Cloud project
- **Danger**: 🔴 **EXTREMELY SENSITIVE** - equivalent to root password
- **Do**: Use Cloud Secret Manager or Workload Identity
- **Don't**: Commit to Git or hardcode in app
- **Where**: Never in source code, only in CI/CD secrets

### 5. Firebase Service Account Key
```json
{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```
- **What**: Grants full access to Firebase
- **Danger**: 🔴 **EXTREMELY SENSITIVE**
- **Where**: Only in `.gitignore` protected files
- **Use**: Only for Cloud Build, backend admin operations

## 📝 Safe Information - CAN Commit

These are safe to commit to GitHub:

```
✅ .env.example         (template without real values)
✅ .firebaserc          (only project ID, no credentials)
✅ firebase.json        (hosting configuration)
✅ Project ID           (e.g., "community-hero-abc123")
✅ Firebase web config  (public configuration)
✅ Repository structure
✅ Code and documentation
```

## 🛡️ How to Handle Secrets in Different Environments

### Local Development
```bash
# Create .env (never commit)
DATABASE_URL="postgresql://..."
GEMINI_API_KEY="..."

# Use with:
npm run dev
```

### Cloud Run (Production)
```bash
# Option 1: Environment variables
gcloud run deploy my-service \
  --set-env-vars=DATABASE_URL="...",GEMINI_API_KEY="..."

# Option 2: Cloud Secret Manager (recommended)
echo -n "database-url-value" | gcloud secrets create DATABASE_URL --data-file=-
gcloud run deploy my-service \
  --set-env-vars=DATABASE_URL=projects/PROJECT_ID/secrets/DATABASE_URL/versions/latest
```

### GitHub Actions / Cloud Build
```yaml
# cloudbuild.yaml
steps:
  - name: gcr.io/cloud-builders/gcloud
    args:
      - run
      - deploy
      - my-service
      - --set-env-vars=DATABASE_URL=$_DATABASE_URL
substitutions:
  _DATABASE_URL: ${DATABASE_URL}  # From GitHub secrets
```

## 🚨 If You Accidentally Commit a Secret

1. **Immediately stop** - don't push yet
2. **Remove the file**:
   ```bash
   git rm --cached .env
   git reset HEAD .env
   ```
3. **If already pushed**:
   ```bash
   # Rotate the compromised credential immediately
   # Change the password, regenerate the API key, etc.
   
   # Then remove from history:
   git filter-branch --tree-filter 'rm -f .env' HEAD
   git push --force-with-lease
   ```
4. **Rotate all compromised credentials**:
   - Change database passwords
   - Regenerate API keys
   - Create new service accounts

## ✅ Before Deploying to Hackathon

```bash
# 1. Verify .gitignore is correct
cat .gitignore | grep -E "\.env|credentials|secret"

# 2. Check what's about to be committed
git status
git diff --cached

# 3. Verify no secrets in committed files
git grep -i "password\|api_key\|secret\|token" HEAD

# 4. For already pushed repos, scan history
git log -S "password\|api_key" --oneline

# 5. Check for leaked secrets online
# Use: https://github.com/trufflesecurity/trufflehog
brew install trufflehog  # or download
trufflehog filesystem . --json
```

## 📚 Security Best Practices

1. **Never hardcode secrets** - use environment variables
2. **Use secret managers** - Google Cloud Secret Manager, GitHub Secrets
3. **Rotate credentials regularly** - especially after hackathons
4. **Use least privilege** - service accounts should only have necessary permissions
5. **Audit access** - check who can access your secrets
6. **Enable audit logging** - monitor secret access
7. **Use HTTPS only** - for all communication
8. **Limit scope** - credentials should be limited to needed resources

## 🔍 Checking Your Current Setup

```bash
# See what's protected in .gitignore
cat .gitignore

# List all environment files (should NOT be tracked)
git status | grep -i "\.env\|credentials\|secret"

# Check git history for any secrets (should be empty)
git log --all -S "password" --oneline

# Verify .env is not tracked
git ls-files | grep "\.env"  # Should return nothing
```

## 📞 Emergency: Leaked Credentials

If you accidentally leaked a credential:

1. **Invalidate immediately**
   ```bash
   # Database password
   gcloud sql users set-password dbuser \
     --instance=community-hero-db

   # API key
   # Go to Google Cloud Console > APIs & Services > Credentials > Delete key > Create new key

   # Firebase key
   # Go to Firebase > Project Settings > Service Accounts > Delete > Generate new
   ```

2. **Scan code for leaks**
   ```bash
   # Search for patterns
   git log -p | grep -i "api.*key\|password"
   ```

3. **Notify team** if this is a team project

4. **Update all references** to the new credentials

For more info:
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [Firebase Security Rules](https://firebase.google.com/docs/database/security)
- [12-Factor App - Credentials](https://12factor.net/config)
