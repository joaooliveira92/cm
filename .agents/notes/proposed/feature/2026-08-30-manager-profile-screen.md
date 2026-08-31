# Agent Note: Manager Profile screen (Screen 19)

Status: proposed

## Problem

Screen 19 "Manager Status" has been redefined from the imported spec's multiplayer manager-list screen to the single-manager profile-and-tenure screen, absorbing the meaning already carried by the `manager_status` table (consecutiveMisses, sacked, lastOutcome). What remains is the screen design: which data belongs here vs. keeping their existing homes, how sacking risk is expressed, the vocabulary term for the screen's subject to resolve the name collision with `manager_status`, and what the screen shows once the save is archived read-only.

## Proposal

### Naming and vocabulary

The screen is called **Manager Profile** — matching the existing `manager_profile` table and `ManagerProfileView` schema. **"Manager Status" is retired as a domain term.** The `manager_status` table keeps its technical name as a SQL/internal artifact (it tracks outcome state, not identity) but is not a player-facing concept. The `ManagerOutcome` type and its values (`none`, `warned`, `sacked`) remain the correct domain terms for what that table tracks, already documented under `Consecutive-Miss Counter` → `Manager Warned` / `Manager Sacked`.

"Manager Profile" is added to `CONTEXT.md` as:

> **Manager Profile**: The set of identity data describing the human manager, chosen once at creation and immutable for the life of the save: manager name, Archetype origin (or Custom Manager), and the four Pillar values. Persisted in the `manager_profile` table. Distinct from `ManagerOutcome` and the `manager_status` projection, which track sacking tenure and are owned by Season Summary. _Avoid_: Manager Status (retired term).

### Screen content

Manager Profile shows only **profile identity** — the set-and-forget data chosen at creation:

- Manager name
- Archetype name (or "Custom Manager")
- The four Manager Pillar values (as numbers 1–5) under a Management Philosophy section
- Club name
- Current season number
- Tenure length (number of seasons with this club)

These are pure read-only reference. The player chose them once and cannot change them; the screen exists so the values remain inspectable.

### What does NOT belong here

The following stay **exclusive to Season Summary** and must not be restated on Manager Profile:

- Board Objective and Verdict (season-boundary judgment, not profile)
- Consecutive-Miss Counter (mechanical detail owned by Season Summary)
- Manager Outcome / warning state (belongs with the Verdict that produced it)

Duplicating any of these would create two sources of truth for season-boundary judgments and force cross-screen synchronisation that the backend does not support.

### Sacking risk expression

Manager Profile carries a single **passive status badge**:

- `Active` — the save is live and commands are accepted
- `Archived` — the save is read-only (sacked or retired)

No proximity gauge, no counter, no warning text. The model has three discrete states (0→1→2) with no gradient between them, so a "risk percentage" or "danger meter" would be false precision. The player who wants detail on their sacking proximity goes to Season Summary, where the counter and outcome are shown.

### Sacked-save behaviour

When the save is archived (sacked or retired), Manager Profile renders the same profile data in read-only mode with an `[Archived]` banner at the top. The main "You have been sacked — return to saves" messaging stays on Season Summary, where the player naturally lands after the sacking event fires. Manager Profile is reached by browsing an archived save; the player who opens it already knows the career is over.

### Screen placement

Manager Profile is a **career screen** at `/career/$saveId/manager` with a tab in CareerChrome and a `g` key binding. This means it shares the career's persistent shell and is navigable the same way as Squad, Tactics, etc. (The navigation-surface ticket 09 owns the specific tab ordering, binding, and keyboard tier.)

## Alternatives considered

- **Putting the sacking counter and outcome on Manager Profile.** Rejected: Season Summary already shows them (it is the natural home for judgments of a completed season), and duplicating them would require the screen to query `manager_status` independently and stay in sync — a coordination cost with no benefit, since the data is already visible one tab away.
- **Naming the screen "Manager Overview".** Rejected: too vague. "Profile" signals identity; "Overview" signals a summary that would be expected to include the sacking state and counter being removed above.
- **Naming the screen "Manager Status".** Rejected: it's the imported spec's name for a multiplayer screen that no longer exists, and it collides with the `manager_status` read-model table. Retaining it would keep the ambiguity the standing decision was meant to resolve.
- **Adding a sacking-risk proximity gauge.** Rejected: the model lacks the granularity to support one. The consecutive-miss counter is a natural number that jumps discretely (0→1→2); a progress-bar interpretation of it would be misleading because the jump from 1 to 2 is a career-ending event, not a proportional increment.
- **Making Manager Profile a shell-level surface (not a career screen).** Rejected: the data it serves is save-scoped (`manager_profile` is per-save). A shell-level surface would have to pick which save to show, adding a selection step before every visit.

## Acceptance criteria

- Screen 19 is named "Manager Profile" in every player-facing reference.
- "Manager Status" is removed from the domain vocabulary. The only surviving use is the technical table name `manager_status` in schema and read-model code, with a comment explaining it tracks outcome state, not identity.
- The screen renders: manager name, archetype name (or "Custom Manager"), four pillar values 1–5, club name, season number, and tenure length.
- The screen does NOT render: Board Objective, Verdict, consecutive-miss counter, or manager outcome.
- A status badge shows `Active` or `Archived` depending on the save's sacked/retired state.
- Archived saves show the same profile layout with an `[Archived]` banner.
- `CONTEXT.md` carries the "Manager Profile" entry with the collision resolution stated.
- The screen is a career child route, registered in `destinations.ts` and `CareerChrome`.

## Risks

- **The "Manager Profile" name is close to the screen's actual content, which is narrow.** If later screens want to add more manager data (achievements, history graph, notification preferences), the name holds; but if it stays this sparse, the player may wonder why a whole tab exists for three lines of read-only numbers. The mitigations are that (a) the pillar descriptions and contextual help provide depth within the screen, and (b) the screen is visited rarely — its purpose is inspectability, not daily use.
- **`Active` / `Archived` is a new read-model query.** The screen must know whether the save is sacked or retired to choose the badge. The existing `manager_status.sacked` flag covers sacking but not retirement; ticket 07 (Retire Manager) must decide how retirement is recorded so this badge can read it.
- **The navigation-surface ticket (09) may place this screen differently.** The standing decision here is that Manager Profile is a career screen with a tab and binding. If 09 rules otherwise, this note's acceptance criterion on placement would be superseded.