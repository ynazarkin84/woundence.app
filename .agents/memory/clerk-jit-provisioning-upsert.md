---
name: Clerk JIT-provisioning upsert must target the lookup column
description: Race-condition pattern when JIT-provisioning a local user row keyed by an external auth provider's user id (Clerk, Auth0, etc.) on first sign-in
---

When a backend JIT-provisions a local user row on first sign-in (SELECT by
external `authUserId` → INSERT if not found), the INSERT's `ON CONFLICT`
target must be the *same column* the initial SELECT looked up by — not some
other unique column on the table (e.g. `email`).

**Why:** Multiple concurrent requests can hit the auth-resolving endpoint
right after login (React double-render, multiple components/hooks calling
`/api/auth/user`-style routes on mount, browser reload races, etc.). Both
requests see "no existing row" and both attempt an INSERT for the same
external user id. If `ON CONFLICT` targets a *different* unique column than
the one actually colliding, Postgres doesn't catch the conflict there and
throws a raw duplicate-key error instead of upserting idempotently — this
surfaces as an intermittent 500 on first sign-in that's hard to reproduce
manually (it only fires under a race).

**How to apply:** Whenever a table has more than one unique column (e.g. both
`clerkUserId` and `email` unique), make sure `.onConflictDoUpdate({ target })`
matches the column your resolver function actually queries by first. Caught
via e2e testing with `testClerkAuth: true` (the `testing` skill's Clerk
programmatic sign-in), which exercises the real first-sign-in path and
surfaced this as a genuine intermittent failure — worth testing new-user
provisioning flows this way, not just returning-user flows.
