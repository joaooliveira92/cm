# 05 — Extract `@cm-clone/ui` (BLOCKED)

Type: task
Status: blocked

**What to build (if unblocked):** Move the design system into a React package, `@cm-clone/ui`:
`renderer/components/ui` (vendored shadcn/Base UI), `renderer/components/reui`
(`data-grid`, `event-calendar`, `icon-stack`), `renderer/lib/utils.ts` (`cn` / `TEXT_ROLES`), the
`--text-*` / `@theme` token bridge, and `renderer/theme.ts`. ~19k lines.

**Why it is blocked:** `apps/desktop/AGENTS.md` states:

> `components/ui/` is vendored shadcn/Base UI, customized in place. Do not reorganize or reformat it.

Extraction relocates that tree, and effect-lint's "size role owned by a primitive" rule and the
line-ceiling/allowlist machinery are keyed on the `components/ui` path. It also introduces the first
React/JSX package, which `packages/AGENTS.md` does not admit. Both are posture decisions, so this
ticket needs an explicit override and a proposed Agent Note before any file moves.

## Acceptance criteria

- [ ] The `components/ui`-stays-in-place rule and the pure-packages posture are explicitly superseded
      by a recorded decision.
- [ ] Tailwind content globs, the token bridge, effect-lint path rules, and the shadcn lint plugin
      registration all account for the new package.
- [ ] _(then the move itself)_

**Blocked by:** an explicit override decision, not yet taken.

## Answer

_(not started — blocked)_
