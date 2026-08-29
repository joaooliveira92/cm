# 02-seed-save-helper-design

Type: prototype
Status: resolved

## Answer

**Mechanism: a generator**, not checked-in fixtures. It reuses the app's own in-process Effect
layers — `createSave`, then N× `advanceCalendar` — to write a `.sqlite` straight into the target
saves dir, exactly as `apps/desktop/test/*.test.ts` already do. Checked-in `.sqlite` fixtures are
rejected: opaque binaries that rot with schema changes, whereas the app is event-sourced so a save
is just the event stream a generator replays — no schema drift, identical to a real app save.

**Seed scenarios** (one generator call each, producing a `saveId`):

| Seed | Build | Used by |
|---|---|---|
| `fresh` | just `createSave` | most smokes (squad/tactics/transfers/league/fixtures/match-day) |
| `before-matchday` | create + advance to just before Matchday 1 | MatchDay journey, live-control |
| `before-season-end` | advance to Matchday 37/38 | advance-to-conclusion journey |
| `concluded` | advance to `season_complete` (verdict exists) | SeasonSummary smoke (asserts seeded verdict) |

**SaveId mapping**: the generator writes `<savesDir>/<seed>.sqlite` with a fixed `save_meta.name`
(e.g. "Seed: concluded"); the e2e passes its temp `--user-data-dir`'s `saves/` path, and the test
selects the save by that fixed name. The file's `save_meta.id` row is the saveId; the app only
needs the file to exist.

**Prototype asset**: branch `e2e-coverage/prototype-seed-save`, commit
`99c5d2e` (`apps/desktop/test/seed-save.prototype.test.ts`). Proves the concluded-season scenario:
a save builds in ~1.5s and reads back a fixed verdict (`met`, `finalPosition 5`, `season_complete`).

**Caveat for the spec (ticket 03)**: the *verdict* is fixed by the seed, but `finalPosition` and the
concrete W/D/L are real values — the SeasonSummary smoke asserts only the verdict, never a position
or scoreline.

## Question

How does the seed-save helper work, and which seed scenarios must it provide? SeasonSummary's smoke
test and the journeys suite need to jump straight to a state without grinding the calendar in-test.

Decide:
- The exact seed scenarios (settled intent: just-before-season-end, just-before-a-matchday, and a
  concluded-season save — plus whatever else the smoke baseline needs).
- The mechanism: checked-in fixture save files vs a generator that produces them. The app is
  event-sourced (see CONTEXT.md); weigh how save files are stored/located before choosing.
- How a seed maps to a saveId and gets passed to the app under test.

Build a cheap, rough prototype (the shape of the helper + one scenario) to react to. Link the
prototype as an asset on resolution.