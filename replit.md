# Woundence EMR

Advanced Wound Care Electronic Medical Records System for managing patients, wound assessments, appointments, and treatment plans.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs first (required before leaf checks)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; use executeSql for non-interactive environments)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `ANTHROPIC_API_KEY` — enables AI-powered wound image analysis (Claude)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (artifact: `woundence`, path `/`, port 22916)
- API: Express 5 (artifact: `api-server`, path `/api`, port 8080)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: Clerk (`@clerk/express` on the API, `@clerk/react` on web, `@clerk/expo` on mobile) — email/password + Google OAuth
- File uploads: multer + sharp (image optimization to WebP)
- AI: `@anthropic-ai/sdk` (Claude, vision) for wound analysis
- Build: esbuild (CJS bundle)

## Where things live

- DB schema: `lib/db/src/schema/woundence.ts` (all 12 EMR tables)
- API routes: `artifacts/api-server/src/routes/woundence.ts`
- Auth middleware: `artifacts/api-server/src/lib/woundenceClerkAuth.ts`
- Storage layer: `artifacts/api-server/src/lib/woundenceStorage.ts`
- File handling: `artifacts/api-server/src/lib/woundenceFileUpload.ts`
- AI integration: `artifacts/api-server/src/lib/woundenceClaude.ts`
- Frontend types: `artifacts/woundence/src/types/schema.ts` (replaces `@shared/schema`)
- Frontend pages: `artifacts/woundence/src/pages/`
- Frontend hooks: `artifacts/woundence/src/hooks/`
- Theme + CSS: `artifacts/woundence/src/index.css`

## Architecture decisions

- No OpenAPI codegen — frontend uses direct `fetch` via `apiRequest`/`queryClient` with a manual type file (`types/schema.ts`). The EMR was migrated from a non-contract-first app; keeping it direct avoids a large upfront spec-writing effort.
- DB tables use `woundence_` prefix. Clerk owns session storage itself, so there is no local sessions table.
- Auth route for frontend useAuth hook is `/api/auth/user` (not `/api/user`) — handled in `woundenceRouter` alongside the other EMR routes. It JIT-provisions a local `woundence_users` row (keyed by `clerkUserId`) on first sign-in and assigns the `provider` role immediately — no pending/approval gate.
- `sharp` is used via `(sharp as any)(...)` casts to avoid `failOnError` type conflicts between the installed version's runtime API and its TypeScript declarations.
- Web: Clerk session cookie is sent automatically (`credentials: "include"`) — no bearer token handling in browser code. Mobile: no cookie jar on native, so a Clerk session token is attached explicitly as a `Bearer` header via a token-getter set from `useAuth().getToken()`.

## Product

Woundence is a wound care EMR providing:
- **Patient management** — demographics, insurance, medical history
- **Wound tracking** — per-wound assessments with measurements, tissue type, exudate, pain scoring
- **AI wound analysis** — Claude-powered image analysis from uploaded photos
- **Appointments** — scheduling with status tracking
- **Visit notes** — SOAP-style visit documentation
- **Treatment plans** — multi-step care plan management
- **Insurance rules** — coverage configuration by provider class
- **Audit logs** — full HIPAA-style access audit trail
- **Role-based access** — provider / admin roles via Clerk (email/password + Google OAuth); new sign-ups get the `provider` role immediately, no approval gate

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `pnpm --filter @workspace/db run push` is interactive; in non-TTY shells use `executeSql` directly to create/alter tables.
- The `woundence` frontend artifact has no OpenAPI codegen — do not run `pnpm --filter @workspace/api-spec run codegen` expecting it to produce woundence hooks.
- react-day-picker v9 API: use `month_caption`, `button_previous`, `button_next`, `day_button`, `weekdays`, `weekday`, `month_grid`, `week` class names (not the v8 `caption`, `nav_button_previous`, etc.). Use `Chevron` component (not `IconLeft`/`IconRight`).
- The woundence DB schema's wound assessments use `exudateAmount` and `exudateOdor` (not a single `exudate` field).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
