# Woundence EMR

Advanced Wound Care Electronic Medical Records System — patient records, wound assessments with AI-assisted photo analysis, appointments, visit notes, and treatment plans.

This repo is a **pnpm monorepo** built and normally run inside [Replit](https://replit.com). This guide covers running it locally (e.g. with Claude Code) outside of Replit.

## Stack

- Node.js 24, pnpm 10 (workspaces), TypeScript 5.9
- Frontend: React + Vite — `artifacts/woundence`
- API: Express 5 — `artifacts/api-server`
- Mobile: Expo (React Native) — `artifacts/woundence-mobile`
- Database: PostgreSQL + Drizzle ORM — schema in `lib/db`
- Auth: [Clerk](https://clerk.com) (email/password + Google OAuth)
- AI: Claude (`@anthropic-ai/sdk`) for wound image analysis

## Prerequisites

- Node.js **24.x**
- pnpm **10.x** (`corepack enable` or `npm i -g pnpm`)
- A PostgreSQL database (see [Database](#database))

## 1. Clone and install

```bash
git clone https://github.com/ynazarkin84/woundence.app.git
cd woundence.app
pnpm install
```

This project **only supports pnpm** — a `preinstall` script blocks `npm`/`yarn`.

## 2. Environment variables

On Replit, these are managed as "Secrets" and injected automatically. Locally, you need to supply them yourself. None of these values are stored in the repo — get them from whoever manages the Replit project's Secrets pane, or from each service's own dashboard.

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | api-server, db | Postgres connection string |
| `CLERK_SECRET_KEY` | api-server | Clerk server-side auth |
| `CLERK_PUBLISHABLE_KEY` | api-server | Clerk auth (server-resolved) |
| `VITE_CLERK_PUBLISHABLE_KEY` | woundence (web) | Clerk auth (browser) |
| `VITE_CLERK_PROXY_URL` | woundence (web) | Optional — only needed if using a Clerk proxy domain |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | woundence-mobile | Clerk auth (mobile) |
| `ANTHROPIC_API_KEY` | api-server | AI wound image analysis (Claude) |
| `BOOKING_API_KEY` | api-server | Shared secret for the booking API route |

> **Security:** never commit real values for any of these to git. This repo has a pre-commit hook (secretlint) that blocks commits containing obvious credential patterns — see [Security](#security).

### How each service reads its env vars

- **api-server** (Node/Express) reads `process.env` directly — there's no `.env` auto-loading wired in. Export vars in your shell before running it, e.g.:
  ```bash
  set -a
  source .env.api-server   # a plain KEY=value file you create locally, gitignored
  set +a
  pnpm --filter @workspace/api-server run dev
  ```
  (Node 24 also supports `node --env-file=.env` if you prefer to wire that into the start script yourself.)
- **woundence** (Vite) auto-loads `.env.local` from `artifacts/woundence/`. Only vars prefixed `VITE_` are exposed to the browser:
  ```bash
  echo "VITE_CLERK_PUBLISHABLE_KEY=pk_..." > artifacts/woundence/.env.local
  ```
- **woundence-mobile** (Expo) — its `dev` script currently wires in several Replit-specific values (`REPLIT_DEV_DOMAIN`, `REPL_ID`, etc.) that don't exist locally. See [Mobile / Expo](#mobile--expo) below.

## 3. Database

The app needs a reachable PostgreSQL instance and `DATABASE_URL` pointing at it. You can either:
- point at the **same** database used by the Replit project (ask for that connection string if you want to see the same data), or
- spin up your own local/dev Postgres and push the schema into it:
  ```bash
  pnpm --filter @workspace/db run push
  ```
  This command is **interactive** (it may ask to confirm destructive changes). If you're scripting this non-interactively, use `drizzle-kit push --force` or apply schema changes via direct SQL instead.

Schema source of truth: `lib/db/src/schema/woundence.ts` (12 tables, all prefixed `woundence_`).

## 4. Running the backend (API server)

```bash
cd woundence.app
set -a; source .env.api-server; set +a   # load your env vars
PORT=8080 pnpm --filter @workspace/api-server run dev
```

The API server serves everything under `/api` (e.g. `http://localhost:8080/api/healthz`).

## 5. Running the frontend (web app)

```bash
PORT=22916 BASE_PATH=/ pnpm --filter @workspace/woundence run dev
```

**Important gotcha:** on Replit, a shared reverse proxy makes `/` (web) and `/api` (backend) appear on the same origin, so the frontend can call `fetch("/api/...")` with a relative URL. Locally there is no such proxy — the web app and API server are two separate dev servers on two separate ports. A plain `pnpm --filter @workspace/woundence run dev` will start the UI, but its `/api/...` calls will 404 against the Vite dev server instead of reaching port 8080.

To fix this for local full-stack development, either:
- add a local-only Vite dev proxy (`server.proxy` in `artifacts/woundence/vite.config.ts`) forwarding `/api` → `http://localhost:8080`, or
- run everything behind your own lightweight reverse proxy (e.g. Caddy/nginx) that mimics Replit's routing.

Ask your assistant to wire this up for you if you want a ready-made local dev proxy — it's a small, safe addition that won't affect how the app runs on Replit.

## 6. Mobile / Expo

The mobile app's `pnpm --filter @workspace/woundence-mobile run dev` script is written for Replit (it injects `REPLIT_EXPO_DEV_DOMAIN`, `REPLIT_DEV_DOMAIN`, `REPL_ID`). For local development, run Expo directly instead:

```bash
cd artifacts/woundence-mobile
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_... pnpm exec expo start
```

Then open the project in Expo Go (or a simulator) per Expo's usual workflow. The mobile app talks to the API server, so make sure `EXPO_PUBLIC_DOMAIN` (or however you configure the API base URL for a non-Replit host) points at a backend it can actually reach — `localhost` won't work from a physical device, use your machine's LAN IP or a tunnel.

## 7. Typecheck & build

```bash
pnpm run typecheck:libs   # build shared libs first (required before leaf checks)
pnpm run typecheck        # full monorepo typecheck
pnpm run build            # typecheck + build all packages
```

## 8. Deployment

This project was built assuming Replit's deployment platform, which already understands the multi-service layout above (one domain, path-based routing to each service, secrets management, health checks defined in each `artifact.toml`). The simplest way to deploy is to use Replit's built-in "Publish/Deploy" from the workspace.

If you want to self-host outside Replit instead, you'll need to reproduce that routing yourself:
- Build each service: `pnpm run build`.
- Run the API server: `node --enable-source-maps artifacts/api-server/dist/index.mjs` with `PORT=8080`, `NODE_ENV=production`, and all env vars from the table above.
- Serve the web app's static build (`artifacts/woundence/dist/public`) behind a web server, with a rewrite of unmatched paths to `/index.html` (SPA routing).
- Put a reverse proxy in front of both so `/api/*` reaches the API server and everything else reaches the static web build on the same origin/domain.
- Mobile: build via `pnpm --filter @workspace/woundence-mobile run build` and follow Expo's standard app-store/OTA release process.

## Security

- A pre-commit hook (`.husky/pre-commit`, powered by secretlint, config in `.secretlintrc.json`) scans staged files for credential patterns and blocks commits that contain them.
- `attached_assets/` and `.migration-backup/` are gitignored — never store real credentials there even temporarily.
- If you ever paste a real API key or service account key into a file in this repo (even temporarily), treat it as compromised and rotate/revoke it — don't rely on `git rm` or `.gitignore` alone, since the value may already be committed to history.

## Where things live

| Area | Path |
|---|---|
| DB schema | `lib/db/src/schema/woundence.ts` |
| API routes | `artifacts/api-server/src/routes/woundence.ts` |
| Auth middleware | `artifacts/api-server/src/lib/woundenceClerkAuth.ts` |
| Storage layer | `artifacts/api-server/src/lib/woundenceStorage.ts` |
| File uploads | `artifacts/api-server/src/lib/woundenceFileUpload.ts` |
| AI integration | `artifacts/api-server/src/lib/woundenceClaude.ts` |
| Frontend types | `artifacts/woundence/src/types/schema.ts` |
| Frontend pages | `artifacts/woundence/src/pages/` |
| Frontend hooks | `artifacts/woundence/src/hooks/` |
