---
name: Woundence EMR architecture
description: Key non-obvious design decisions for the Woundence EMR migration into the pnpm workspace
---

## Rule
The Woundence EMR frontend uses **no OpenAPI codegen**. All API interactions go through direct `fetch` calls (`apiRequest` / `queryClient`) with a manually maintained type file at `artifacts/woundence/src/types/schema.ts`.

**Why:** The EMR was migrated from a legacy app with no OpenAPI spec. Writing the full spec upfront would have been large scope; direct fetch with manual types was the pragmatic port path.

**How to apply:** Do not run `pnpm --filter @workspace/api-spec run codegen` expecting woundence hooks. When adding new endpoints, add the types to `types/schema.ts` manually and call the route directly via `apiRequest`.

## Other key decisions
- DB table prefix: `woundence_*` (except `sessions` which is shared).
- Auth user endpoint the frontend `useAuth` hook calls: `/api/auth/user` (registered inside `woundenceRouter`, not a separate route file).
- Wound assessments use `exudateAmount` and `exudateOdor` fields (not a single `exudate` column) — the form in `WoundAssessmentForm.tsx` must use those names.
- Session store uses `connect-pg-simple` writing to the shared `sessions` table.
