# Agent Note: Screen operations become a first-class Action registry

Status: proposed

## Problem

The renderer is greenfield for keyboard: zero `onKeyDown`, `tabIndex`, or `autoFocus` across nine screens. Every screen operation is an inline closure wired straight to a button — `onAdvanceCalendar` in `LeagueTableScreen.tsx`, `onBid` / `onSignFreeAgent` / `onRespondToBid` in `TransfersScreen.tsx`, substitution and tactics handlers inside `MatchDayScreen.tsx`. Nothing anywhere knows what operations exist or whether one is currently available.

A keyboard-first app (level 3, mouse-free) needs a command palette and a help overlay that enumerate what is possible. Without a registry, those would need to hardcode the same list in two more places, duplicated from the button wiring, with no way to ask "is this action currently available?" without reaching into each screen's local state.

## Proposal

Every screen operation becomes a first-class **Action** — a named, scoped, dispatchable record:

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

- Actions are declared colocated per screen (exported from each screen file) and collected into a single registry at startup.
- The registry is the single source of truth: the command palette, help overlay, key bindings, and rendered buttons are four views of the same record.
- Migration is all-or-nothing per screen: every button on a converted screen dispatches an Action. No screen lives in a mixed state where unregistered operations are invisible to the palette.
- The Action model is the spine of the effort: tickets 05 (key map), 06 (focus model), 07 (palette), 09 (router), 10 (table nav), 11 (match day), and 12 (e2e) all depend on it.

### Scoping

- `scope: "global"` for navigation, palette, help — available on every screen.
- `scope: "squad"` (etc.) for screen-specific operations — only active when that screen is shown.
- Two actions with the same `id` in different scopes are distinct. The registry merges current scope + globals into the active set.

### Availability

- `available` is a pure boolean predicate over a minimal `ScopeState` (the current screen's read model, not the full React tree).
- Unavailable actions are shown disabled in the palette with a reason, not hidden — this teaches the model.
- No Action registry entry has side effects during registration.

### Shape details

- `id` is a kebab-case string key (`"advance-calendar"`, `"place-bid"`) — stable across screens so the key map and help overlay use the same identifier.
- `label` is a short human-readable string for palette/help display.
- `binding` is optional — the default keyboard shortcut. Player rebinding is a separate question gated by ticket 05.
- `handler` returns `Promise<void>`. Errors surface through the screen's existing error display, which the Action model does not replace.

### ADR worthiness

This decision earns an ADR. The three conditions from the domain-modeling skill are all met:
1. **Hard to reverse**: introducing a registry across nine screens is structural — reversing it means undoing the wiring in every screen.
2. **Surprising without context**: the screens currently have no abstraction layer; a future reader will wonder "why add indirection?"
3. **Result of a real trade-off**: indirection cost vs. discoverability, weighed and decided.

## Alternatives considered

- **No registry (keyboard handlers call inline closures directly).** Ad-hoc and zero upfront cost, the path of least resistance. Rejected because it cannot support level 3 from the destination: a command palette needs to *enumerate* what is possible and *check availability*, and without a registry it would need to duplicate those lists in two more places (palette, help overlay) with no type-level guard against drift. If the destination concedes level 3, this becomes viable — but it does not.
- **Layered alongside current handlers.** Keep the existing button closures as they are and layer keyboard handlers on top, migrating screens only where needed. Rejected because a half-migrated state means the palette lists only registered Actions while unregistered operations stay invisible. The palette would lie about what is possible, defeating the purpose of having one.
- **A middleware/dispatch architecture like Redux.** Push every operation through a central dispatch with middleware for logging, instrumentation, etc. Rejected as over-engineered for nine screens with three mutation operations each. The registry is a record of what exists, not a runtime dispatch pipeline.
- **Per-screen ad-hoc palette wiring without a shared Action type.** Each screen would provide its own palette entries and key bindings as a tuple of label+handler, without a shared type or availability contract. Rejected because it cannot express the Action model's invariants: that availability is a predicate, that bindings are optional and inspectable, and that the palette and help overlay consume the same shape as the key-binding layer.

## Acceptance criteria

- Every button on a converted screen dispatches an Action from the registry.
- The command palette shows all currently-available Actions (global + current scope) and no stale entries.
- Unavailable Actions are shown disabled with a reason, not hidden.
- Adding a new operation to a screen means adding one Action record — no separate wiring for button, palette entry, help overlay entry, and key binding.
- `pnpm check:all` passes.

## Risks

- **Scope drift.** Nothing mechanically prevents registering an Action with the wrong scope. If this recurs, it is a candidate lint rule per the repo's rule on routing repeat review findings.
- **Availability predicates can lie.** A predicate can return `true` when the backend would reject the command, or `false` when it would succeed. The predicate is a best-effort frontend optimisation for the palette UX, not a permission gate — the backend still validates all commands.
- **Half-migration erodes trust.** If a future contributor adds a button without registering an Action, the palette becomes incomplete. Code review must catch this until a lint rule exists.