---
name: sharp type workaround
description: @types/sharp type mismatch with failOnError option; use (sharp as any)() to avoid compile errors.
---

## Rule
Do not pass `{ failOnError: ... }` directly to `sharp()`. It causes `TS2353: Object literal may only specify known properties` because the installed `@types/sharp` version doesn't include that option.

**Why:** The runtime `sharp` library supports `failOnError` but the TypeScript declarations in the installed version of `@types/sharp` don't expose it in `SharpOptions`.

**How to apply:** Cast the import:
```ts
const sharpInstance = (sharp as any)(fileBuffer, { limitInputPixels: false });
```
Remove `failOnError` from the options object. The default behavior (no hard fail on corrupt input) is acceptable for this use case.
