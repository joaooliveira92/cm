# Agent Note: Match-Day keyboard control flow

Status: implemented

## Problem

Match Day is the app's hardest case for keyboard-first: a live commentary feed revealing on a timer, a polling match, and a collapsible tactics/substitution control panel — plus the app's only true modal decision point, the injury pause. The screen must stay fully mouse-free without a parallel keyboard mirror, and without letting a modal or panel swallow the match itself.

## Decision

Keyboard control during a running match lives inside the control panel's scope. The key invariant: **panel controls are keyboard-reachable only while the panel is open.** The panel publishes its open state to the keyboard spine as a new soft overlay layer (`"panel"` in `resolveDispatch`): while the panel is topmost it suppresses the bare keys and the `g` prefix beneath it, but `Primary+K` / `Primary+/` stay live — a panel is not a hard modal. Escape and the injury choices are seam bindings gated on the panel being open and topmost, so splash/palette/help close before the panel.

### Escape semantics in context

| State | Escape |
|---|---|
| Panel open | Close the panel; the feed continues |
| Panel closed | No-op (the feed continues) |
| Paused (injury decision pending) | Close the panel + close the injury modal; the match **stays paused** — Escape never resumes it |

`Primary+K` opens the palette in all three states. Escape is resolved through the priority policy (`Escape` matches no registered bare binding), not re-bound as a user key.

### Injury decision flow

When an orange injury with a reached substitution cap pauses the feed, an inline modal offers two choices: **Play On** (`Enter` — keep the crippled player on at escalation risk; a local acknowledgement, no command issued) or **Bring Off** (`B` — submit `ForceOff`, play with 10 men). Escape closes the modal and panel but leaves the pause in place for deliberation. The modal and the spine share one condition (`orange injury` + `capReached` + full XI).

### Two-step substitution

Out player, then in player, against the server-reported caps (`used/5`, `windowsUsed/3`, `capReached`), no-subs, and same-player-swap rules, enforced by a pure `validateLiveSubstitution` producing a visible `role="alert"` reason — never a silent no-op. `Enter` confirms a complete draft, `Escape` aborts and closes the panel. Reuses the `set-live-substitute-off`/`set-live-substitute-in`/`make-substitution` Actions; the out options are the on-pitch XI and the in options the bench (disjoint, so same-player swaps are unreachable through the UI and enforced defensively by the validator). Cap-reached disables the controls.

### Live tactics

Mentality, Tempo, and Pressing are roving one-tab-stop composites while the panel is open: `Tab` cycles the three groups, `ArrowLeft`/`ArrowRight` toggle the options and move the focus, `aria-pressed` marks the active option. No inline formation editing — the formation stays fixed live and the Tactics screen owns full redrafts.

## Verification

- `test/matchday-live-keyboard.test.tsx` — panel-open-only bindings; Escape semantics (open/closed/paused); Enter→Play On submits no command (mock RPC call count asserted); B→Bring Off submits `ForceOff`; Escape keeps the pause; palette still opens, second-Escape stacking; two-step substitution Enter/Escape and same-player rejection with a visible reason; tactics arrow toggles + one tab stop per group.
- `test/match-substitution-validation.test.ts` — pure validator across the six error variants and boundary caps.
- `test/keymap-priority.test.ts` — AC-33 soft-layer suppression (bare→none, g→none, Primary→action, typing→native, Escape closed→none, no registered Escape binding).
- `test/tactics-keyboard-reachability.test.tsx` — Tactics screen all-native controls driveable (Level-1 guarantee).
- `test/transfers-dialog-keyboard.test.tsx` — counter-offer NaN guard (F8 family): non-empty invalid disables submit + inline error, empty submit surfaces the error, fresh per modal open.
- `pnpm check:all` green.

## Risks

- **Live cap refresh is untested end-to-end.** The pre-existing poll drops the `resumeSimulation` payload, so the "server-reported on every poll" cap path is not exercised by a test; this ticket reads caps from the session/boundary and validates against them. The Stage-7 match-day e2e owns closing that gap.
- **`Enter` over a native focus target.** The seam skips Enter-to-Play-On when the focused element natively consumes Enter (e.g. a button), preserving AC-19's Enter-activates-focused-control rule.
- **Panel-as-soft-overlay nuance.** The panel suppresses bare keys but not `Primary+` — a deliberate derivation from the decision's "Primary+K still opens the palette in all three states" row; a future hard-overlay layer must not reuse this branch silently.