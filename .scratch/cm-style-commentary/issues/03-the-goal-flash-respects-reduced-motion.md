# 03: The goal flash respects reduced motion

Spec: [spec.md](../spec.md)

**What to build:** with the operating system's reduced-motion setting on, a flash line does not blink in
the commentary bar; it is marked once (bold, inverted) for the length of the blink instead.

**Acceptance:** with `prefers-reduced-motion: reduce`, a goal line is inverted once and never toggles.

**Blocked by:** 01

**Status:** resolved

## Answer

`useFlash` in `apps/desktop/src/renderer/match/CommentaryBar.tsx` reads `prefers-reduced-motion`: when it is
set, a flash line stays inverted for the length of the blink and never toggles. Covered in
`apps/desktop/test/renderer/match/commentary-bar.test.tsx`.
