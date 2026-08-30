# Agent Note: Screen operations become a first-class Action registry

Status: implemented

## Problem

The renderer was greenfield for keyboard: zero `onKeyDown`, `tabIndex`, or `autoFocus` across nine screens. Every screen operation was an inline closure wired straight to a button — `onAdvanceCalendar` in `LeagueTableScreen.tsx`, `onBid` / `onSignFreeAgent` / `onRespondToBid` in `TransfersScreen.tsx`, substitution and tactics handlers inside `MatchDayScreen.tsx`. Nothing anywhere knew what operations exist or whether one is currently available.

A keyboard-first app (level 3, mouse-free) needs a command palette and a help overlay that enumerate what is possible. Without a registry, those would need to hardcode the same list in two more places, duplicated from the button wiring, with no way to ask "is this action currently available?" without reaching into each screen's local state.

## Decision

Every screen operation is a first-class **Action** — a named, scoped, dispatchable record:

```typescript
interface Action {
  readonly id: string;
  readonly label: string;
  readonly scope: "global" | ScreenName;
  readonly available: (context: ScopeState) => boolean;
  readonly handler: () => Promise<void>;
  readonly binding?: string;
}
```

### Registry, not ad-hoc

- Actions are declared colocated per screen (exported from each screen file) and collected into a single registry at startup (`renderer/actions/allActions.ts` + `registry.ts`).
- The registry is the single source of truth: the command palette, help overlay, key bindings, and rendered buttons are four views of the same record.
- Migration is all-or-nothing per screen: every button on a converted screen dispatches an Action. No screen lives in a mixed state where unregistered operations are invisible to the palette.
- The Action model is the spine of the effort: tickets 05 (key map), 06 (focus model), 07 (palette), 09 (router), 10 (table nav), 11 (match day), and 12 (e2e) all depend on it.

### Scoping

- `scope: "global"` (split into `app-global` / `career-global`) for navigation, palette, help — available on every screen / every career screen.
- `scope: <screen>`, e.g. `"transfers"`, for screen-specific operations — only active when that screen is shown.
- Two actions with the same `id` in different scopes are distinct and legal. The registry merges current scope + globals into the active set.

### Availability and dispatch

- `available` is a pure boolean predicate over a minimal `ScopeState` (the current screen's read model, not the full React tree). Unavailable actions are excluded from the active set.
- Unavailable actions are shown disabled in the palette with a reason, not hidden — this teaches the model (Stage 4).
- No Action registry entry has side effects during registration. Handlers are screen-live: screens register their handlers (`registerActionHandler`) knowing they close over React hooks (mutation setters); the registry holds the structure, and buttons/key map/palette dispatch by stable `id` (`dispatchAction`). A handler is present exactly while its screen is mounted, so the palette can never list an Action the registry cannot dispatch.

### Shape details

- `id` is a kebab-case string key (`"advance-calendar"`, `"place-bid"`) — stable across screens, shared by the key map and help overlay.
- `label` is a short human-readable string for palette/help display.
- `binding` is the default keyboard shortcut, optional. Player rebinding is a separate question gated by ticket 05.
- Anchor: ADR-0012 (`docs/adr/0012-action-registry-for-keyboard-first.md`).

## Verification

- `test/actions-registry.test.ts` — active-set merging, scope exclusion, availability filtering, and the AC-17 collision / locked-infra-key checks.
- `test/actions-inventory.test.tsx` — every rendered `data-action-id` on converted screens maps to a registered Action in the right scope; the canonical registry is collision-free.
- `pnpm check:all` green.

## Risks

- **Scope drift.** Nothing mechanically prevents registering an Action with the wrong scope. If this recurs, it is a candidate lint rule per the repo's rule on routing repeat review findings.
- **Availability predicates can lie.** A predicate can return `true` when the backend would reject the command, or `false` when it would succeed. The predicate is a best-effort frontend optimisation for the palette UX, not a permission gate — the backend still validates all commands.
- **Half-migration erodes trust.** If a future contributor adds a button without registering an Action, the palette becomes incomplete. Code review must catch this until a lint rule exists.
