---
name: Expo mobile auth with Clerk
description: Wiring @clerk/expo into an Expo Router app, including SDK version pinning and the bearer-token bridge pattern for native (no cookie jar)
---

Replaces the older `expo-cookie-session-auth.md` pattern (Replit OIDC +
session cookies) — that pattern no longer applies once a backend moves to
Clerk auth.

- Native apps have no cookie jar shared with `fetch()`, unlike web. Attach the
  Clerk session as a `Bearer` header explicitly: keep a module-level
  token-getter function in the API client (`setAuthTokenGetter`), and set it
  from a small component that calls `useAuth().getToken()` inside
  `ClerkProvider`/`ClerkLoaded`, so every native request carries a fresh
  token.
- Route gating: Expo Router's `Stack.Protected guard={...}` pattern (guard on
  `isSignedIn` from Clerk's `useAuth()`) cleanly separates `(auth)` vs
  `(tabs)` route groups without manual redirect logic.
- **Version pinning matters**: `@clerk/expo` and its native peer deps
  (`expo-auth-session`, `expo-crypto`, `expo-secure-store`) must match the
  project's actual Expo SDK version — picking versions without checking the
  SDK compat matrix causes install/runtime mismatches. Verify against the
  installed `expo` version before adding these packages.
- After adding new route files/groups (e.g. a new `(auth)` group), the Expo
  dev server must be restarted to regenerate `.expo/types/router.d.ts` —
  otherwise `Link href="/sign-in"` etc. fails typecheck with stale typed-route
  errors even though the route exists and works at runtime.
