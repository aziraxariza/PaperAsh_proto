# syntax=docker/dockerfile:1

FROM node:20-slim AS base
WORKDIR /app
RUN corepack enable

# --- Install dependencies (cached layer) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# --- Build client (Vite) + server (esbuild) ---
FROM deps AS build
COPY . .
RUN pnpm run build

# --- Runtime image ---
FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle

EXPOSE 3000
CMD ["node", "dist/index.js"]
