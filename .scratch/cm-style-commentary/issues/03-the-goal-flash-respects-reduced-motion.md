# 03: The goal flash respects reduced motion

Spec: [spec.md](../spec.md)

**What to build:** with the operating system's reduced-motion setting on, a flash line does not blink in
the commentary bar; it is marked once (bold, inverted) for the length of the blink instead.

**Acceptance:** with `prefers-reduced-motion: reduce`, a goal line is inverted once and never toggles.

**Blocked by:** 01

**Status:** ready-for-agent
