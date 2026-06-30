# Single stage build - simpler and more reliable
FROM node:20

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10

# Copy pnpm config and package files
COPY pnpm-lock.yaml package.json ./

# Install all dependencies (builds bcrypt for Linux)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build frontend and server
RUN pnpm run build

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "dist/server.cjs"]
