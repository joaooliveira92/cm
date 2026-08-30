# Agent Note: Match-Day Keyboard Control Flow

**Decision:** Define the keyboard interaction model for match-day live control during a running match.

**Context:** Ticket 11 (prototype) addresses how keyboard control works during a live match. The map needs a clear decision on:

1. **Escape semantics** – Escape closes the control panel only when it is open; when closed, it serves as a fallback to match-level actions (e.g., exiting the panel).
2. **Injury decision flow** – When an orange injury occurs with no substitution capacity, the feed pauses. The manager sees an inline modal with two options: “Play On” (keep playing with the injured player) or “Bring Off” (remove the player). Escape closes the modal and panel but does not resume the match.
3. **Substitution by keyboard** – A two-step process: first select the outgoing player (via dropdown), then select the incoming player. Validation prevents no-subs, cap-overflow, and same-player swaps. Enter confirms, Escape aborts.
4. **Live tactics** – Three scannable buttons (Mentality, Tempo, Pressing) toggleable with arrow keys while the panel is open.

**Rationale:** These choices align with the map’s goal of specifying the destination (“keyboard-first match”) and define the decision tree that leads to the final route. The prototype (HTML file) demonstrates the flow. The decision ensures the map is complete – every open decision is resolved and the frontier is cleared.

**Impact:** This decision clarifies the “Not yet specified” section of the map, removes ambiguity about keyboard semantics, and provides a concrete basis for the “Out of scope” section (e.g., if the decision later proves incompatible with the chosen architecture, the ticket can be moved out of scope).

**Reference:** Ticket 11 – Match Day Keyboard Control Prototype
