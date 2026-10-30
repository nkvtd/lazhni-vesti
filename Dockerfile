FROM node:24-alpine AS deps-dev
WORKDIR /app
COPY . .
RUN npm ci
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lv-db
RUN npm run drizzle:generate

FROM node:24-alpine AS deps-prod
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
RUN apk add --no-cache tzdata

WORKDIR /app

COPY package.json package-lock.json* ./
COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=deps-dev /app/src/database/migrations ./src/database/migrations
COPY --from=deps-dev /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=deps-dev /app/src/server/load.ts ./src/server/load.ts
EXPOSE 3000
CMD [ "sh", "-c", "npm run drizzle:migrate && node ./dist/server/index.mjs" ]
