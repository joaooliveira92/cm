# 11-match-day-live-keyboard-control

Type: prototype
Status: resolved
Blocked by: 05, 06

## Question

How does keyboard control work during a *running* match?

Match Day is the hardest case in the app and the one that most justifies keyboard-first: 640 lines,
a commentary feed revealing on a timer, a poll fetching further chunks, a collapsible tactics and
substitution panel, and pause-for-decision moments when a player is injured. Every other screen is
static while the player thinks; this one is not.

Build a rough prototype to react to.

Decide:

- **Bindings while the feed runs**: which Actions are live during simulation, and whether opening
  the control panel implicitly pauses. The panel currently overlays a feed that keeps advancing.
- **The injury decision moment**: the simulation pauses awaiting a substitution or a "play on"
  acknowledgement. Decide the keyboard flow for it, since it is the app's only true modal decision
  point and it is time-pressured.
- **Substitution by keyboard**: selecting the player coming off and the player coming on, against
  the server-reported 5-substitution and 3-window caps. This is a two-step selection with
  validation, and it is the most complex keyboard interaction in the app.
- **Tactics tweaks by keyboard**: the mentality, pressing and tempo sliders are currently button
  rows. Whether they become adjustable in place with arrow keys.
- **Escape semantics here**: what Escape means when a panel is open over a running match — close
  the panel, or a match-level action. Must agree with the global reserved keys from ticket 05.
- **Focus and the reveal timer**: the feed re-renders on every revealed line. Confirm the focus
  model survives a component that re-renders every 350ms, and if it does not, say what changes.

Link the prototype as an asset.

**Prototype:** [HTML prototype](../prototype/11-match-day-live-keyboard-control-prototype.html)

## Answer

A keyboard-first control flow for a running match needs to handle **three concurrent states**:

1. **The feed itself** – commentary lines revealed every 350ms, continuing unabated.
2. **The control panel overlay** – open/closed, managing player actions.
3. **The injury decision moment** – a paused state where manager must decide.

### Decision points

- **Escape semantics:** `Escape` closes the control panel **only** when open. When closed, `Escape` falls through to a match-level action (e.g., exit to sideline). This agrees with the global key map from ticket 05.
- **Bindings during feed:** When feed is running and panel closed, `Primary+K` opens palette, `Primary+/` help. Panel-open bindings (substitution, tactics) are only accessible via palette or by clicking the panel toggle – no hidden keyboard triggers for non-palette actions.
- **Injury decision:** When orange injury with no subs remaining, feed pauses. The manager sees an inline modal (knock-or-play-on). `Enter` triggers "play on", `B` triggers "bring off". Escape closes the modal and also closes panel if open, but does **not** resume the match – the pause persists for the manager to deliberate.
- **Substitution by keyboard:** Two-step modal — first `S` opens substitution tab in palette or panel, first subkey selects outgoing player, second selects incoming player. Validation guards against no-subs, cap reached, or same-player swap. `Enter` confirms, `Escape` aborts and panel closes.
- **Tactics live:** Three scannable buttons (Mentality, Tempo, Pressing) each toggleable with arrow keys while panel open. `Tab` cycles between them. No inline editing – use dedicated Tactics screen for full formation.

### Escape semantics in context

The key invariant: **panel controls are keyboard-accessible only when panel is open**. When closed during a live feed:

| Key Combination | Panel Open | Panel Closed | Paused |
|-----------------|------------|--------------|--------|
| Escape | Close panel | No-op (feed continues) | Close panel + close injury modal |
| Primary+K | Open palette | Open palette | Open palette |
| S | Open substitution tab | N/A (panel must open via Primary+K first) | N/A |

The prototype demonstrates this flow with clickable equivalents. See the Agent Note for full rationale.
