# pnpm Setup & Usage Guide

This project uses **pnpm** exclusively. No npm or yarn.

## Install pnpm

```bash
# Install pnpm globally
npm install -g pnpm@10

# Verify installation
pnpm --version
```

## pnpm Commands Reference

```bash
# Install dependencies (uses pnpm-lock.yaml)
pnpm install

# Add a new dependency
pnpm add package-name

# Add dev dependency
pnpm add -D package-name

# Remove dependency
pnpm remove package-name

# Run scripts from package.json
pnpm dev       # Start development server
pnpm build     # Build for production
pnpm lint      # Run linter
pnpm start     # Start production server

# Update dependencies
pnpm update

# Clean
pnpm clean     # Remove node_modules and dist
```

## Project Structure

```
Community-Hero/
├── package.json        # Dependencies and scripts
├── pnpm-lock.yaml      # Locked versions (COMMIT THIS)
├── node_modules/       # Installed packages (NOT committed)
├── dist/              # Built output (NOT committed)
├── src/               # Frontend + Backend source code
└── server.ts          # Backend entry point
```

## Development Workflow

```bash
# 1. Clone and setup
git clone https://github.com/sai-phaneesh/Community-Hero.git
cd Community-Hero
pnpm install

# 2. Start development
pnpm dev

# 3. Test locally
# Frontend: http://localhost:5173
# Backend: http://localhost:5001

# 4. Build for production
pnpm build

# 5. Deploy
firebase deploy --only hosting
```

## Docker & Deployment

The `Dockerfile` uses pnpm exclusively:

1. **Build stage** (`node:20`):
   - Installs pnpm@10
   - Runs `pnpm install --frozen-lockfile` (compiles bcrypt for Linux)
   - Runs `pnpm run build`
   - Prunes dev dependencies

2. **Runtime stage** (`node:20-slim`):
   - Copies prebuilt `node_modules` (includes Linux-compiled bcrypt)
   - Runs the server

To deploy:

```bash
# Build Docker image for Linux
docker build --platform linux/amd64 -t gcr.io/project-id/community-hero:latest .

# Push to registry
docker push gcr.io/project-id/community-hero:latest

# Deploy to Cloud Run
gcloud run deploy community-hero-backend \
  --image=gcr.io/project-id/community-hero:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars=DATABASE_URL="...",GEMINI_API_KEY="..."
```

## Why pnpm?

- **Fast**: Installs dependencies 3x faster than npm
- **Efficient**: Stores packages in centralized store, creates hard links
- **Strict**: Enforces monorepo best practices
- **Reliable**: Locked versions in `pnpm-lock.yaml`
- **Better Docker**: Handles native modules (like bcrypt) better than npm

## Lock File (pnpm-lock.yaml)

- **ALWAYS commit** this file to Git
- Ensures everyone uses exact same versions
- Enables reproducible builds in Docker
- Never modify manually - use `pnpm add/remove/update`

## Troubleshooting

### "pnpm: command not found"
```bash
npm install -g pnpm@10
```

### "Cannot find module" errors
```bash
# Clear and reinstall
pnpm clean
pnpm install
```

### Need to add a new package?
```bash
# Add to production
pnpm add express

# Add to dev dependencies
pnpm add -D @types/node
```

## CI/CD (GitHub Actions, Cloud Build, etc.)

All CI/CD systems should use:
```bash
pnpm install --frozen-lockfile
pnpm run build
```

Never use `npm install` or `yarn install` in CI.

## One Last Thing

**Never use npm or yarn with this project.** pnpm-lock.yaml is the source of truth for dependencies.

If you see `package-lock.json` appear, delete it:
```bash
rm package-lock.json
```
