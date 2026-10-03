# Agent Note: Manager Profile screen (Screen 19)

Status: implemented

## Problem

Screen 19 "Manager Status" had been redefined from the imported spec's multiplayer manager-list screen to the single-manager profile-and-tenure screen, absorbing the meaning already carried by the `manager_status` table (consecutiveMisses, sacked, lastOutcome). What remained was the screen design: which data belongs here vs. keeping their existing homes, how sacking risk is expressed, the vocabulary term for the screen's subject to resolve the name collision with `manager_status`, and what the screen shows once the save is archived read-only.

## Decision

### Naming and vocabulary

The screen is called **Manager Profile** — matching the existing `manager_profile` table and `ManagerProfileView` schema. **"Manager Status" is retired as a domain term.** The `manager_status` table keeps its technical name as a SQL/internal artifact (it tracks outcome state, not identity) but is not a player-facing concept; its DDL comment in `apps/desktop/src/main/schema.ts` says so. The `ManagerOutcome` type and its values (`none`, `warned`, `sacked`) remain the correct domain terms for what that table tracks, documented under `Consecutive-Miss Counter` → `Manager Warned` / `Manager Sacked`.

`CONTEXT.md` carries the "Manager Profile" entry with the collision resolution stated.

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

The following stay **exclusive to Season Summary** and are not restated on Manager Profile:

- Board Objective and Verdict (season-boundary judgment, not profile)
- Consecutive-Miss Counter (mechanical detail owned by Season Summary)
- Manager Outcome / warning state (belongs with the Verdict that produced it)

Duplicating any of these would create two sources of truth for season-boundary judgments and force cross-screen synchronisation that the backend does not support. `ManagerProfileScreenView` carries none of those fields, so the separation is enforced at the contract, not by screen discipline.

### Sacking risk expression

Manager Profile carries a single **passive status badge**:

- `Active` — the save is live and commands are accepted
- `Archived` — the save is read-only (sacked or retired)

No proximity gauge, no counter, no warning text. The model has three discrete states (0→1→2) with no gradient between them, so a "risk percentage" or "danger meter" would be false precision. The player who wants detail on their sacking proximity goes to Season Summary, where the counter and outcome are shown.

### Sacked-save behaviour

When the save is archived, Manager Profile renders the same profile data in read-only mode with an `[Archived]` banner at the top. The main "You have been sacked — return to saves" messaging stays on Season Summary, where the player naturally lands after the sacking event fires. Manager Profile is reached by browsing an archived save; the player who opens it already knows the career is over.

### Screen placement

Manager Profile is a **career screen** at `/career/$saveId/manager` with a tab in `CareerChrome` and the `g m` binding. It shares the career's persistent shell and is navigable the same way as Squad, Tactics, etc.

`g m` previously reached Match Day; Match Day moved to `g d` ("match **d**ay"). Manager Profile has the stronger claim on `m`, and Match Day's own binding was the only free-of-conflict move.

## Alternatives considered

- **Putting the sacking counter and outcome on Manager Profile.** Rejected: Season Summary already shows them (it is the natural home for judgments of a completed season), and duplicating them would require the screen to query `manager_status` independently and stay in sync — a coordination cost with no benefit, since the data is already visible one tab away.
- **Naming the screen "Manager Overview".** Rejected: too vague. "Profile" signals identity; "Overview" signals a summary that would be expected to include the sacking state and counter being removed above.
- **Naming the screen "Manager Status".** Rejected: it's the imported spec's name for a multiplayer screen that no longer exists, and it collides with the `manager_status` read-model table. Retaining it would keep the ambiguity the standing decision was meant to resolve.
- **Adding a sacking-risk proximity gauge.** Rejected: the model lacks the granularity to support one. The consecutive-miss counter is a natural number that jumps discretely (0→1→2); a progress-bar interpretation of it would be misleading because the jump from 1 to 2 is a career-ending event, not a proportional increment.
- **Making Manager Profile a shell-level surface (not a career screen).** Rejected: the data it serves is save-scoped (`manager_profile` is per-save). A shell-level surface would have to pick which save to show, adding a selection step before every visit.
- **Giving Manager Profile a free key (`g p`, `g g`) instead of taking `m` from Match Day.** Rejected: the ticket named `g m`, and "m for manager" is the binding a player guesses. Match Day is reachable from the fixtures flow as well as its tab, so it absorbs the move more cheaply than Manager Profile absorbs a non-mnemonic key.

## Consequences

- `ManagerProfileScreenView` (contracts) carries `profile`, `clubName`, `seasonNumber`, `tenureSeasons`, and `archived` — and deliberately nothing else. `getManagerProfileScreen` (main) reads it from `manager_profile`, `clubs`, `season`, and `manager_status`.
- Tenure is the count of `season` rows. A save is bound to one club for its whole life, so "seasons with this club" and "seasons in this save" are the same number; it stays correct once Season rollover inserts a row per Season.
- The career destination set grew from seven screens to eight. `CAREER_SCREEN_TYPES`, `CAREER_G_BINDINGS`, `ResolvedDestination`, the adapter switch, the router tree, `ScreenName`/`CareerScreenName`, `SCREEN_METADATA`, `isCareerScreen`, and the spine's completion set all enumerate that set by hand, so each had to be extended. `CAREER_TABS` is now exported from `router/career.tsx` and asserted equal to `CAREER_SCREEN_TYPES`, which turns the tab strip's drift from that set into a test failure rather than a screen that is keyboard-only.
- `g m` is Manager Profile; Match Day is `g d`. Any muscle memory for `g m` → Match Day is broken, deliberately.
- `archived` reads `manager_status.sacked`, the only cause of an Archived Save the schema records today. Manager Retired — the second cause — folds into the same flag when ticket 02 lands, with no change to the screen or the view: the badge keys off the archived state, never off the cause.
- **The "Manager Profile" name is close to the screen's actual content, which is narrow.** If later screens want to add more manager data (achievements, history graph, notification preferences), the name holds; but if it stays this sparse, the player may wonder why a whole tab exists for three lines of read-only numbers. The mitigations are that (a) the pillar descriptions and contextual help provide depth within the screen, and (b) the screen is visited rarely — its purpose is inspectability, not daily use.
