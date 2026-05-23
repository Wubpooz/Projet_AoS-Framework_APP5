# syntax=docker/dockerfile:1.7

# Base image
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install full dependencies (for development/build tasks)
FROM base AS deps
COPY package.json bun.lock ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN bun install --frozen-lockfile --ignore-scripts

# Install production-only dependencies
FROM base AS prod-deps
COPY package.json bun.lock ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN bun install --frozen-lockfile --production --ignore-scripts

# Build context stage (keeps all source files available)
FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Ensure Prisma client artifacts are generated in the image
RUN bun run prisma:generate

# -------------------
# Development target
# -------------------
FROM build AS dev
ENV NODE_ENV=development
EXPOSE 3000
USER bun
CMD ["bun", "--hot", "run", "backend/src/index.ts"]

# ------------------
# Production target
# ------------------
FROM base AS prod
ENV NODE_ENV=production

COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/backend ./backend
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/bun.lock ./bun.lock

EXPOSE 3000
USER bun
CMD ["bun", "run", "backend/src/index.ts"]
