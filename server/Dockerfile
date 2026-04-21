# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@latest --quiet

# Copy workspace manifests first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY server/package.json ./server/package.json

# Install all dependencies (puppeteer build scripts are already blocked by
# onlyBuiltDependencies in package.json — system Chrome is used at runtime)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN pnpm install --frozen-lockfile --filter server --filter "@smarttutor/*"

# Copy source
COPY server/ ./server/

# Generate Prisma client
RUN pnpm --filter server exec prisma generate

# Compile TypeScript
RUN pnpm --filter server run build

# Create a flat, symlink-free node_modules for the runner (pnpm deploy resolves
# the virtual store symlinks into a real directory structure)
RUN pnpm --filter server deploy --prod --legacy /deploy


# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

# Install Chromium + dependencies for Puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy built artefacts from builder
COPY --from=builder /app/server/dist   ./dist
COPY --from=builder /app/server/prisma ./prisma

# Flat node_modules from pnpm deploy (no symlinks, no virtual store issues)
COPY --from=builder /deploy/node_modules ./node_modules

# Persistent uploads directory (mount as volume in production)
RUN mkdir -p /app/uploads

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/index.js"]
