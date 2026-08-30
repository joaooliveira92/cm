Type: task
Status: ready-for-agent
Blocked by: 18

# 20: Match Day live keyboard control and remaining tier-3 interaction

**What to build:** the live-match keyboard path: control-panel keyboard bindings active only while
the panel is open, panel Escape semantics closing the panel without abandoning the match, the injury
pause with Play On / Bring Off choices (Escape closes panel + injury modal, match stays paused),
the two-step substitution flow (out player, then in player) validated against the server-reported
substitution caps and no-subs/same-player rules, and live Mentality/Tempo/Pressing toggles via arrow
keys inside the open panel. Together with any remaining tier-3 interactions on the Transfers and
Tactics screens needed to make Match Day, Transfers, Tactics, and Squad driveable with no mouse.

**Decisions:**

- Keyboard control during a running match — panel Escape semantics, injury decision flow, two-step substitution flow, and live tactics toggles. Keyboard-bound within the control panel; escape closes panel only; injury pause with `Play On` / `Bring Off` choices; substitution requires two-key sequence; tactics toggles with arrow keys. See [Agent Note](../../../.agents/notes/proposed/2026-08-29-matchday-keyboard-flow.md).

**Blocked by:** 18.

**Status:** ready-for-agent

- [ ] AC-33: Match Day keyboard flow: panel Escape semantics, injury Play On/Bring Off with pause, two-step substitution against server-reported caps, tactics arrow toggles.
- [ ] Match Day, Transfers, Tactics, and Squad are driveable with no mouse (tier-3 done-criteria).

## Comments

- Published from the approved to-tickets breakdown (spec: `.scratch/keyboard-first-renderer/spec.md`, Stage 5 — match day).