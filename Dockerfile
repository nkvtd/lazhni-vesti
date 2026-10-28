# install all dependencies (devDeps + deps) for build & migrations
FROM node:24-alpine AS deps-dev
WORKDIR /app
COPY . .
RUN npm ci
ENV DATABASE_URL=/app/database/sqlite.db
RUN npm run drizzle:generate
# install production-only dependencies for the runtime image
FROM node:24-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
# build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
RUN npm run build
# production runtime image
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
ENV BETTER_AUTH_SECRET=dev-secret-please-change-me-in-production
# github
ENV GITHUB_CLIENT_ID= \
    GITHUB_CLIENT_SECRET=
# postgres database
ENV DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
COPY package.json package-lock.json* ./
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=deps-dev /app/database/migrations ./database/migrations
COPY --from=deps-dev /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=deps-dev /app/server/load.ts ./server/load.ts
EXPOSE 3000
CMD [ "sh", "-c", "npm run drizzle:migrate && node ./dist/server/index.mjs" ]
