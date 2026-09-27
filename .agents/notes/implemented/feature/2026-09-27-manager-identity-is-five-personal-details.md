# Agent Note: A manager is five personal details, not one name

Status: implemented

## Problem

The Manager step's personal-details panel collected two strings: a save name and an optional
"Manager name". The manager had no nationality, no date of birth, and no club they supported, so the
identity a Career was created with was a single free-text label. The Manager Profile screen could
show only that label plus the Pillars.

The panel needed to become the manager's actual identity: first name, last name, nationality, date
of birth, and favorite team. That forced three modelling questions the single string avoided — how
the name is stored, where nationality comes from, and whether a favorite team is required — plus a
DB change, since `manager_profile` is an immutable creation-time row.

## Decision

### First and last name, and derive the display name

`manager_profile.manager_name` was replaced by `first_name` and `last_name`, both `NOT NULL`, each
1–40 characters after trimming. There is no stored display name: every reader composes
`${firstName} ${lastName}`. `SaveSummary.managerName` stays on the wire and is derived from the two
columns in `readSaveSummary`, so the Save List and `loadSave` are unchanged.

This is the one place a stored derived value was tempting, and it was declined: a `display_name`
column is a second source of truth that can disagree with the names it was derived from, and nothing
edits the manager after commit, so there is no counter-argument.

### Nationality is a `nations` referent

`nationality_id` is `NOT NULL` and references `nations(id)`. Generation copies every nation of the
ruleset into every save unconditionally, so the picker offers the full list without waiting on world
generation, and the renderer reads the same list from `NATION_CODES` in `@cm-clone/shared` rather
than through an RPC. Country names are factual geography and are resolved from code (`nationName`),
not through the content pack, matching players.

### Date of birth is an ISO string, not a typed age

`date_of_birth` is `TEXT` in `YYYY-MM-DD`, the same shape `players.date_of_birth` uses. The panel
uses the shadcn Date Picker (a Base UI `Popover` over a `react-day-picker` Calendar) and refuses
future dates. No age is stored or enforced beyond that: nothing in the simulation reads the
manager's age, so a minimum-age policy would be a rule with no reader.

### Favorite team is optional and bound to the world

`favorite_club_id` is `NULL`-able and references `clubs(id)`. Not every manager supports a club, so
the panel accepts no pick. The renderer loads the club list through the same `getClubSelection` read
the club step uses, and stores the pick with the provisional world id beside it
(`FavoriteTeamRecord`), so a pick from a replaced world reads as no pick — the rule
`ClubSelectionRecord` already established. The favorite club's display name is resolved through the
save's content pack in main, like every other club name.

### One completeness predicate

`personalDetailsComplete` is the single predicate the in-panel stepper, the bottom bar, and the
commit gate on. It requires save name, first name, last name, nationality, and date of birth; the
favorite team is deliberately absent.

## Alternatives considered

- **Keep `managerName` as a display name and add first/last beside it.** Rejected: two ways to name
  the manager, and the free-text one would drift from the structured pair.
- **Free-text nationality and favorite team.** Rejected: both already have referents in the world,
  and free text would make the manager's nationality and club unrelatable to anything.
- **Store a `nationality` column on `manager_profile` rather than `nationality_id`.** Rejected: the
  world already models nations, and a text column would not join to it.
- **Make the favorite team required.** Rejected: a manager who supports no club is a coherent
  state, and forcing a pick adds a choice with no consequence.
- **Constrain the date of birth to a working-age window relative to the career start.** Deferred:
  there is no simulation reader for the manager's age, so the window would be a UI rule stated
  nowhere else. The picker's forward bound (no future dates) is the whole constraint for now.

## Consequences

- **The wire change is breaking.** `ManagerProfileView` and `commitCareer`'s payload both changed
  shape. Saves are disposable during development, so there is no migration; a save made under the
  old schema is refused by the schema-version gate rather than read with missing columns.
- **The favorite-team picker depends on generation.** Until the provisional world is ready the
  control is disabled; if generation fails the manager can still be completed (the team is
  optional), which keeps the panel from coupling to a lifecycle it does not own.
- **`ManagerProfileView` carries resolved display names.** Nationality and favorite-club names are
  resolved in main, so a reader of the view does not have to know about the content pack or
  `nationName`; both are present alongside their ids.
