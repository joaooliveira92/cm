# 20: Match Day live keyboard control and remaining tier-3 interaction

**What to build:** the live-match keyboard path: control-panel keyboard bindings active only while
the panel is open, panel Escape semantics closing the panel without abandoning the match, the injury
pause with Play On / Bring Off choices (Escape closes panel + injury modal, match stays paused),
the two-step substitution flow (out player, then in player) validated against the server-reported
substitution caps and no-subs/same-player rules, and live Mentality/Tempo/Pressing toggles via arrow
keys inside the open panel. Together with any remaining tier-3 interactions on the Transfers and
Tactics screens needed to make Match Day, Transfers, Tactics, and Squad driveable with no mouse.

**Decisions:**

- Keyboard control during a running match — panel Escape semantics, injury decision flow, two-step substitution flow, and live tactics toggles. Keyboard-bound within the control panel; escape closes panel only; injury pause with `Play On` / `Bring Off` choices; substitution requires two-key sequence; tactics toggles with arrow keys. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-matchday-keyboard-flow.md).

**Blocked by:** 18.

**Status:** resolved

- [x] AC-33: Match Day keyboard flow: panel Escape semantics, injury Play On/Bring Off with pause, two-step substitution against server-reported caps, tactics arrow toggles. (`matchday-live-keyboard.test.tsx` — open-only bindings, Escape open/closed/paused table, palette stacking, Enter→Play On submits no command, B→Bring Off submits `ForceOff`, Escape keeps the pause, two-step Enter/Escape + same-player rejection, roving arrow-toggled sliders + Tab cycling; `match-substitution-validation.test.ts` — six error variants + boundary caps.)
- [x] Match Day, Transfers, Tactics, and Squad are driveable with no mouse (tier-3 done-criteria). (Match Day: this ticket's suite. Transfers: `transfers-dialog-keyboard.test.tsx` incl. counter-offer NaN guard folded here. Tactics: `tactics-keyboard-reachability.test.tsx`. Squad: ticket 19's `table-grid-navigation.test.tsx`.)

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 5 — match day).
- Implemented, reviewed (APPROVE), two lows folded (vacuous Play On assertion → mock call-count negative; stale counter-offer error reset per modal open). Close: implemented the decision's own Escape table "No-op (feed continues)" for panel-closed, not the decision-ticket prose's "match-level action" (no such action exists; the table/spec/AC-33 all say no-op); no `S`→substitution-tab binding (panel is single-section, not tabbed; AC-33 lists none). Note `2026-08-29-matchday-keyboard-flow` promoted proposed → implemented. Gate green (`pnpm check:all`: typecheck/lint/effect-lint/verify-md-links ✓, 400 desktop tests).