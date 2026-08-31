# Map: Game Status Survivors

Label: `wayfinder:map`

## Destination

A `spec.md` at the effort root that maps each survivor of removed Screen 18 to its host surface (CareerChrome, Save List, About dialog), with a deviation register recording the removed sections (world counts, diagnostics, runtime state). Handable to `/to-spec` → `/to-tickets`.

## Notes

**Domain**: local single-player football-management sim. Vocabulary in [CONTEXT.md](../../CONTEXT.md).

**Skills every session should consult**: `grilling` and `domain-modeling` by default; `effect-code` for any session touching source; `doc-standards` for any docs written.

**The imported spec is not a requirement.** It is the anchor for identifying survivors and recording deviations. The survivors redistribute into existing surfaces; no GameStatusSnapshot type or route will be created.

## Decisions so far

- [1 — SaveSummary schema: add sacked and schemaVersion](issues/01-savesummary-schema-extension.md): `SaveSummary` schema extends to `{ id, name, createdAt, sacked, schemaVersion }`; `save_meta` table gets `sacked INTEGER DEFAULT 0` and `schema_version INTEGER DEFAULT 1` columns; `readSaveSummary` joins `manager_status` for sacked, reads/returns the new columns; `listSaves` atom caches the extended view.

- [2 — SeasonSummaryView schema: add saveName](issues/02-seasonsummary-save-name-extension.md): `SeasonSummaryView` schema includes `saveName: string`; `getSeasonSummary` RPC adds `save_meta.name` to its join; CareerChrome consumes `seasonSummaryAtom` on every career screen to render save name + season/phase in a single text line.

- [3 — App version mechanism: Vite define](issues/03-app-version-vite-define.md): `import.meta.env.APP_VERSION` is defined in `vite.config.ts` from `package.json` `version` field; exported via a renderer-only `src/version.ts` module; About dialog imports it for display.

- [4 — About dialog: trigger and content](issues/04-about-dialog-spec.md): Modal dialog with app version (from Vite) and save schema version (from `SeasonSummaryView`). Triggered by `?` key binding and an optional "About" button in CareerChrome. No new route, uses existing overlay infrastructure (`Overlay.tsx` pattern from `HelpOverlay`/`CommandPalette`).

- [5 — CareerChrome data source: reuse seasonSummaryAtom](issues/05-careerchrome-data-source.md): CareerChrome receives `saveId` prop, consumes `seasonSummaryAtom(saveId)` to render `{saveName} — Season {seasonNumber} {phase}`; sacked state not needed here (lives on Save List); one line, subdued styling.

- [6 — Archive badge on Save List](issues/06-save-list-archive-badge.md): When `SaveSummary.sacked` is true, render `(Archived)` badge on the save card; read-only indication matching Season Summary's "You have been sacked" messaging.

- [7 — Screen 18 survivors map to surfaces](issues/07-screen-18-survivors-redistribution.md): Career date/season → CareerChrome; Archive badge → Save List; App + schema version → About dialog; World counts — dropped; Safe diagnostic copy — dropped; Runtime state — dropped.

## Not yet specified

<!-- none — every question settled. -->

## Out of scope

- **World entity counts** (clubs, players, staff, competitions) — developer trivia with no precedent.
- **Safe diagnostic copy action** — no support channel, no bug-report pipeline.
- **Runtime state** (memory, workers, cache, session uptime, processing activity) — removed by blanket scope trim (ticket 03 in Group A reconciliation).
- **Multiplayer / cloud / network state** — removed wholesale (group-a-reconciliation standing decision).
- **`GameStatusSnapshot` type and async refresh machinery** — entirely removed; data is synchronous read.
- **Refresh, Copy Diagnostic, Open Save Status buttons** — no corresponding actions exist.

---

## Tickets

### Frontier (open, unblocked)

- None — map is complete, destination reached.

### Closed (resolved)

See Decisions so far above.