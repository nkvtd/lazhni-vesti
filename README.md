<div align="center">
  <br />
  <img src="assets/lv_logo.svg" alt="Лажни вести? logo" width="360" />
  <br /><br />

  <p align="center">
    <strong>Daily satirical Macedonian headline-guessing web game</strong>
  </p>

  <p align="center">
    Inspired by Wordle and built around real, bizarre, and seemingly unbelievable headlines from Macedonian news portals — featuring daily challenges, a 12-month archive heatmap, streaks, badges, leaderboards, and a Time Machine recovery mechanic.
  </p>

  <p align="center">
    <a href="#overview">Overview</a> •
    <a href="#key-features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#architecture--pipeline">Architecture</a> •
    <a href="#gameplay--gamification">Gameplay</a> •
    <a href="#editorial-pipeline--admin-panel">Editorial Pipeline</a> •
    <a href="#development-setup">Development</a> •
    <a href="#production-deployment">Production</a>
  </p>

  <p align="center">
    <a href="https://github.com/nkvtd/lazhni-vesti/actions/workflows/lint.yml"><img src="https://img.shields.io/github/actions/workflow/status/nkvtd/lazhni-vesti/lint.yml?style=flat-square&logo=github&label=lint" alt="Lint Status" /></a>
    <a href="https://github.com/nkvtd/lazhni-vesti/actions/workflows/docker.yml"><img src="https://img.shields.io/github/actions/workflow/status/nkvtd/lazhni-vesti/docker.yml?style=flat-square&logo=docker&logoColor=white&label=docker" alt="Docker Build" /></a>
    <img src="https://img.shields.io/badge/vike-SSR-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vike SSR" />
    <img src="https://img.shields.io/badge/vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3" />
    <img src="https://img.shields.io/badge/hono-server-E36002?style=flat-square&logo=hono&logoColor=white" alt="Hono" />
    <img src="https://img.shields.io/badge/postgresql-18-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 18" />
    <img src="https://img.shields.io/badge/drizzle-ORM-C5F74F?style=flat-square&logo=drizzle&logoColor=black" alt="Drizzle ORM" />
  </p>
</div>

---

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture \& Pipeline](#architecture--pipeline)
- [Gameplay \& Gamification](#gameplay--gamification)
  - [Scoring \& Single-Word Blanks](#scoring--single-word-blanks)
  - [Guest Play \& Account Sync](#guest-play--account-sync)
  - [Archive, Heatmap \& Time Machine](#archive-heatmap--time-machine)
  - [Badges \& Leaderboards](#badges--leaderboards)
- [Editorial Pipeline \& Admin Panel](#editorial-pipeline--admin-panel)
- [Routes \& RPC Surface](#routes--rpc-surface)
  - [Pages (Vike SSR)](#pages-vike-ssr)
  - [Telefunc RPCs (`/_telefunc`)](#telefunc-rpcs-_telefunc)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [1. Clone \& Install](#1-clone--install)
  - [2. Configure Environment Variables](#2-configure-environment-variables)
  - [3. Start PostgreSQL \& Run Migrations](#3-start-postgresql--run-migrations)
  - [4. Run in Development Mode](#4-run-in-development-mode)
  - [Available Scripts](#available-scripts)
- [Production Deployment](#production-deployment)
- [Project Structure](#project-structure)

---

## Overview

**„Лажни вести?“** (`lazhni-vesti`) turns absurd, real Macedonian news headlines into a daily word-guessing game. Every day at midnight (`Europe/Skopje`), a new curated headline goes live with 2–3 key single words hidden behind inline blanks (`{{0}}`, `{{1}}`, etc.). Players decipher the missing words before their score hits zero, unlocking satirical hints along the way and revealing the original headline and source link once the round concludes.

Under the hood, the application is a full-stack TypeScript SSR app built on **Vike**, **Vue 3**, **Hono**, **Telefunc**, **Better Auth**, and **Drizzle ORM** backed by **PostgreSQL 18**. An automated RSS scraper pulls candidate headlines into a moderation queue, where editors can use an integrated LLM assistant to draft blanks and satirical hints before scheduling immutable daily challenges.

---

## Key Features

- **Daily Headline Challenges (`Europe/Skopje`):** One global puzzle per day rotating at Skopje midnight, with server-side answer masking so unrevealed words, hints, and source URLs never leak to the client.
- **Instant Guest Play with Verified Sync:** Unregistered players can start immediately with progress saved in `localStorage`. Signing up or logging in on the same day automatically migrates and server-verifies their session into PostgreSQL.
- **12-Month Archive & Activity Heatmap:** A 52-week GitHub/LeetCode-style activity grid and chronological archive for replaying up to a year of past headlines in Free Play or Time Machine mode.
- **Time Machine Recovery:** Players can spend `1,500` accumulated points (up to `2` times per Skopje calendar month) to replay a missed archive date and repair a broken streak or earn credit toward a monthly badge.
- **Streak & Monthly Badges:** Automatic awards for `7`, `30`, and `100` consecutive winning days, plus monthly `"Месечен Шампион (YYYY-MM)"` badges for `15+` wins in a calendar month.
- **Daily & All-Time Leaderboards:** Top-50 daily rankings (score descending, completion time tie-breaker, excluding free play) and top-50 all-time rankings with earned badge icons.
- **Automated RSS Aggregator & AI-Assisted Admin Panel:** A 6-hour background scraper filters Macedonian news feeds by keyword into a staging queue, paired with an admin dashboard supporting full CRUD, search, LLM-generated blank/hint proposals, and transactional publishing.
- **Concurrency-Safe Backend:** Registered gameplay writes are serialized inside PostgreSQL transactions with row-level `FOR UPDATE` locking, future-date access is blocked at both route and RPC layers, and database unique constraints enforce idempotency.

---

## Tech Stack

| Category | Technology | Role in `lazhni-vesti` |
| :--- | :--- | :--- |
| **SSR & Routing** | Vike, `vike-vue` | Filesystem routing, SSR `+data.ts` loaders, `+guard.ts` access guards, and hydration. |
| **Frontend UI** | Vue 3 (Composition API), Tailwind CSS v4 | Reactive game board, archive heatmap, modals, and newsprint/brutalist design tokens (`Bitter` + `Inter`). |
| **HTTP Server** | Hono, `@vikejs/hono`, `@universal-middleware/core` | Request pipeline for DI middleware, Better Auth session resolution, Telefunc RPCs, and Vike SSR. |
| **RPC Layer** | Telefunc | Type-safe client-to-server mutations (`/_telefunc`) with `Abort` error bubbling. |
| **Database & ORM** | PostgreSQL 18, Drizzle ORM, `postgres.js` | Relational storage (`timestamptz`), HMR-safe singleton pool, transactional locks, and SQL migrations. |
| **Authentication** | Better Auth (Drizzle PG Adapter) | Email/password, custom player fields (`role`, `totalPoints`, streaks), and auto-generated handles. |
| **AI / LLM** | OpenAI SDK (`openai`) | Connects to OpenAI-compatible inference (`gpt-6-luna`, `30s` timeout) to propose single-word blanks and satirical hints. |
| **Code Quality** | Biome, TypeScript | Unified linting, formatting, and strict static type checking. |
| **Deployment** | Docker, GitHub Actions, GHCR | Multi-stage production builds pushed to `ghcr.io/nkvtd/lazhni-vesti:latest` and orchestrated via Docker Compose. |

---

## Architecture & Pipeline

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                      Editorial & Content Pipeline                         │
│          RSS / JSON Feeds  ──►  ScraperService (6h cron + 10s timeout)    │
│                                        │                                  │
│                                        ▼                                  │
│                              staged_articles (DB)                         │
│                                        │                                  │
│  Admin Panel (/admin) + LlmService (gpt-6-luna, 30s timeout)              │
│                                        │  Transactional Publish           │
│                                        ▼                                  │
│                              daily_challenges (Immutable)                 │
└───────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Hono + Vike Server Pipeline (src/server/hono.ts)                         │
│  1. servicesMiddleware          -> injects { db, llm, scraper, ... }      │
│  2. betterAuthSessionMiddleware -> resolves cookie to { user: AppUser }   │
│  3. betterAuthHandler           -> /api/auth/**                           │
│  4. telefuncHandler             -> /_telefunc RPC mutations               │
│  5. Vike SSR                    -> +guard.ts -> +data.ts -> +Page.vue     │
└───────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  PostgreSQL 18 + Drizzle ORM                                              │
│  • Auth:         user, session, account, verification                     │
│  • Content:      staged_articles, daily_challenges                        │
│  • Gameplay:     game_sessions (unique user_id + challenge_id)            │
│  • Gamification: badges (unique name), user_badges, time_machine_logs     │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Gameplay & Gamification

### Scoring & Single-Word Blanks
- Each hidden slot (`{{0}}`, `{{1}}`, …) represents **one independent word** (never a multi-word phrase). `normalizeSingleWord()` trims, lowercases, strips punctuation, and rejects internal whitespace.
- Every round starts at **`1,000` points** (`MAX_SCORE`):
  - **Wrong guess:** `-50` points (`WRONG_PENALTY`).
  - **Satirical hint:** `-250` points (`HINT_PENALTY`), available only while `score > 250`.
  - **Floor:** `0` points.
- **Completion:** Solving all blanks with `score > 0` wins the round (`won: true`); hitting `0` points ends the round as a loss (`won: false`). In both cases, the server reveals `originalTitle`, `sourceUrl`, and all answers for the summary modal and clipboard share.

### Guest Play & Account Sync
- Guests play statelessly by sending their client `anonState` to `onSubmitGuess` / `onUnlockHint` and persisting progress in `localStorage` (`lv_anon_YYYY-MM-DD`).
- When a player signs up or logs in on the same day, `useGameSession` calls `onSyncAnonymousSession`, which re-verifies every solved word against the database answers on the server before inserting into `game_sessions` and awarding points/streaks inside a transaction.
- New accounts without a custom display name receive a generated Macedonian handle (e.g. `Sumliv-Machor-42`, `Brza-Mechka-99`) via `UsernameGeneratorService`, editable anytime on `/account` (`3–30` characters).

### Archive, Heatmap & Time Machine
- `/archive` displays a 52-week `ActivityHeatmap` and a list of up to `371` past challenges (`playDate < today`), fetched in a single batched `Promise.all` query without N+1 round-trips.
- **Time Machine Eligibility:** An unplayed past date is eligible for Time Machine recovery when the player has `totalPoints >= 1500`, fewer than `2` uses in the current Skopje calendar month, and winning that date either **extends their active consecutive streak** or **falls within the current calendar month**.
- Winning an eligible Time Machine round deducts `1,500` points, awards the round's score, logs the usage in `time_machine_logs`, and recalculates streaks and badges. Losing incurs no Time Machine charge. Ineligible archive dates remain playable in **Free Play** mode without affecting global stats.

### Badges & Leaderboards
- **Streak Badges:** Automatically awarded at **7**, **30**, and **100** consecutive winning days (`fire`, `trophy`, `crown`).
- **Monthly Badges:** Automatically created and awarded as `Месечен Шампион (YYYY-MM)` (`calendar`) upon reaching **15+** non-free-play wins in a calendar month.
- **Leaderboards (`/leaderboard`):** Tabbed view showing today's top `50` daily finishers (non-free-play, ordered by `score DESC, completedAt ASC`) and the top `50` all-time players (`totalPoints DESC, longestStreak DESC`), complete with earned badge icons.

---

## Editorial Pipeline & Admin Panel

1. **Automated Scraping (`ScraperService`):** Runs every `6` hours in production (and on demand via **"Повлечи вести"** in `/admin`). Polls configured RSS/JSON feeds (default: `https://time.mk/rss/hronika`) with a `10s` timeout, cleans XML/CDATA and trailing suffixes, matches against curated Macedonian keywords, and batch-inserts new articles into `staged_articles` (`onConflictDoNothing` on `source_url`).
2. **Staged Queue & AI Assist (`/admin`):** Role-guarded (`role === "admin"`). Editors can search pending articles (`originalTitle`, `sourceName`, `matchedKeywords`), manually add or edit articles, delete with two-step confirmation, or click **"Генерирај AI шаблон"** to have `LlmService` select 2–3 single words and write satirical hints.
3. **Immutable Publishing:** Clicking **"Објави предизвик"** validates the date and single-word blanks, then runs a transaction marking the staged row `"approved"` and inserting into `daily_challenges`. Published challenges are listed under the read-only upcoming schedule and cannot be overwritten.

---

## Routes & RPC Surface

### Pages (Vike SSR)

| Route | Guard | Description |
| :--- | :--- | :--- |
| `/` | Public | Today's Daily Challenge (`Europe/Skopje`), rules rail, and player score / guest CTA rail. |
| `/archive` | Public | 12-month Activity Heatmap and chronological list of past challenges. |
| `/archive/@date` | Public (`YYYY-MM-DD`, past only) | Play a specific past challenge in Time Machine or Free Play mode (`today` redirects to `/`; future dates return `404`). |
| `/leaderboard` | Public | Daily and All-Time top-50 leaderboards with badge icons. |
| `/login` | Public | Email/password sign-in via Better Auth. |
| `/signup` | Public | Account registration with automatic Macedonian handle generation. |
| `/account` | Authenticated | Player stats, inline username editor, earned badges, Time Machine monthly quota, and sign-out. |
| `/admin` | `role === "admin"` | Staged article queue, manual/RSS ingestion, AI template generator, challenge publisher, and upcoming schedule. |

### Telefunc RPCs (`/_telefunc`)

| Module | Functions | Access |
| :--- | :--- | :--- |
| `src/pages/index/Game.telefunc.ts` | `onSubmitGuess`, `onUnlockHint`, `onSyncAnonymousSession` | Public (sync requires auth) |
| `src/pages/account/Account.telefunc.ts` | `onUpdateUsername` | Authenticated |
| `src/pages/admin/Admin.telefunc.ts` | `onTriggerScrape`, `onSearchStagedArticles`, `onCreateStagedArticle`, `onUpdateStagedArticle`, `onDeleteStagedArticle`, `onGenerateAiProposal`, `onPublishChallenge` | Admin (`role === "admin"`) |

---

## Development Setup

### Prerequisites
- **Node.js** `>= 22` / `24`
- **PostgreSQL 18** (or Docker + Docker Compose)

### 1. Clone & Install

```bash
git clone https://github.com/nkvtd/lazhni-vesti.git
cd lazhni-vesti
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```ini
# PostgreSQL connection string (required)
DATABASE_URL=postgresql://postgres:password@localhost:5432/lazhni_vesti

# Better Auth secret and base URL (required)
BETTER_AUTH_SECRET=your-random-secret
BETTER_AUTH_URL=http://localhost:3000

# OpenCode / OpenAI API key for AI headline proposals in /admin (required for AI assist)
OPENAI_API_KEY=your-opencode-api-key

# Optional GitHub OAuth credentials
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=
```

### 3. Start PostgreSQL & Run Migrations

```bash
# Start PostgreSQL 18 via Docker Compose
docker compose up -d postgres

# Apply Drizzle SQL migrations
npm run drizzle:migrate
```

### 4. Run in Development Mode

```bash
npm run dev
```

To access `/admin`, register an account, open Drizzle Studio (`npm run drizzle:studio`), and set your user's `role` column to `admin`.

### Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Start the Vike + Hono development server with HMR. |
| `npx tsc --noEmit` | Run strict TypeScript type checking across the project. |
| `npm run lint` | Run Biome lint and formatting checks on `src/`. |
| `npm run lint:fix` | Auto-fix Biome lint issues in `src/`. |
| `npm run format` | Format the repository with Biome (4-space indentation). |
| `npm run drizzle:generate` | Generate SQL migrations from `src/database/drizzle/schema/`. |
| `npm run drizzle:migrate` | Apply pending SQL migrations to PostgreSQL. |
| `npm run drizzle:studio` | Launch Drizzle Studio to inspect and edit database rows. |
| `npm run prod` | Pull latest GHCR image and start/update the production stack (`docker compose pull && docker compose up -d`). |

---

## Production Deployment

Pushing to `main` triggers `.github/workflows/lint.yml` and `.github/workflows/docker.yml`, building the multi-stage `Dockerfile` (with `tzdata` and `TZ=Europe/Skopje`) and publishing `ghcr.io/nkvtd/lazhni-vesti:latest`.

On the production host:

```bash
# Ensure .env is configured for production, then pull and start
npm run prod
```

On container startup, `lv-app` waits for `lv-postgres` to become healthy, automatically runs `npm run drizzle:migrate`, initializes the singleton services and 6-hour RSS scraper via `+server.ts`, and serves the Hono + Vike app on port `3000`.

---

## Project Structure

```text
lazhni-vesti/
├── assets/
│   └── lv_logo.svg                   # Project logo
├── src/
│   ├── components/
│   │   ├── admin/                    # ChallengeEditorModal, StagedArticleRow
│   │   ├── archive/                  # ActivityHeatmap (52-week grid)
│   │   ├── game/                     # GamePlay, HeadlineBoard, WordBlankSlot, ScoreHud, GameSummaryModal, AnonSyncBanner
│   │   ├── layout/                   # Navbar, Footer
│   │   └── ui/                       # BadgeIcon
│   ├── composables/
│   │   └── useGameSession.ts         # Reactive game state (hybrid DB + localStorage)
│   ├── database/
│   │   ├── migrations/               # Drizzle Kit SQL migrations
│   │   └── drizzle/
│   │       ├── db.ts                 # HMR-safe singleton pool + Db, Tx, DbOrTx types
│   │       ├── relations.ts          # Drizzle relational definitions
│   │       ├── schema/               # auth, articles, gameplay, gamification tables
│   │       └── queries/              # challenges, gameplay, gamification, leaderboard, staging, util
│   ├── pages/                        # Vike filesystem routes (+guard.ts, +data.ts, +Page.vue, *.telefunc.ts)
│   ├── server/
│   │   ├── services/                 # ScraperService, LlmService, UsernameGeneratorService, singleton container
│   │   ├── better-auth.ts            # Better Auth config & username hook
│   │   ├── better-auth-handler.ts    # Session middleware & /api/auth/** handler
│   │   ├── hono.ts                   # Hono middleware & Vike integration
│   │   └── telefunc-handler.ts       # /_telefunc RPC handler
│   └── utils/                        # error.ts, format.ts
├── +server.ts                        # Vike server entry & production startup hook
├── Dockerfile                        # Multi-stage production container build
├── docker-compose.yml                # lv-app + lv-postgres orchestration
├── biome.json                        # Biome configuration
├── drizzle.config.ts                 # Drizzle Kit configuration
├── global.d.ts                       # Vike, Universal & Telefunc context types
├── vite.config.ts                    # Vite plugins (Vike, Vue, Tailwind v4, Telefunc)
```