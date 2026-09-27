# 18: two e2e failure shapes from 2026-09-26 that no longer reproduce

Type: bug
Status: needs-info

**Blocked by:** none. This waits on a reproduction, not on another ticket.

Split from [17](17-desktop-e2e-fails-random-specs-in-full-runs.md) on 2026-09-27. Ticket 17 named its
main cause: the Mac going into idle system sleep partway through a run. The fix, `e2e/globalSetup.ts`
holding `caffeinate -d -i`, gave five consecutive green full runs. Two shapes 17 recorded match no
sleep in `pmset -g log`, and neither has reproduced since. They are kept here so the next person to
see either one does not start over.

## Shape 1: ~850ms failures across unrelated specs

Seen in ticket 17's first three runs, on 2026-09-26 before 09:53, in a fresh `git worktree` at
`edcea355` after `pnpm install --frozen-lockfile`. Every failure died just under 900ms. The power log
has no sleep or wake event between 07:00 and 09:53 that day. The same session then ran five full
runs at 09:53–10:06 on the same tree, and all were green. No run since has shown this shape.

## Shape 2: `player-search-scouting.spec.ts:91`, a result's name does not open the Profile

Seen twice, both on 2026-09-26: in the full run `wtf2` (11:01–11:04) and in the first of 20
`--repeat-each` repetitions (`rep1`, 11:05). The page snapshot is the same in both. The page is still
Player Search, with the form holding the club name and all 25 result rows rendered. The trace shows
the click on "João Almeida" was dispatched (47ms), and the Profile never appeared. The form did not
reset, so the screen never unmounted: either the `click` never reached the name button, or the
navigation it started was a no-op. Neither time overlaps a sleep. The previous session was running
concurrent-suite and CPU-sampler experiments on the machine at the time.

What has been ruled out:

- **`openPlayer` returning silently.** Unproven either way. The `[probe17]` console log (commit
  `3daade9f`, removed in `042063c1`) recorded `found=true n=25` on every one of 80+ captured clicks,
  but no failing run was captured with it on.
- **The table's focus bookmark.** It is a no-op on this table (`usePlayerSearchRoster`).
- **A late-opening modal.** The teaching splash is dismissed before the click and only opens once.
- **A scroll on focus.** A change of active row neither scrolls nor moves focus (`DataTable`).

The leading hypothesis is untested. The career chrome's "Outstanding before you continue" band
treats a club as having a Tactic until the Tactics read lands (`CareerStateProvider`, `hasTactic`),
then shows "No Tactic set" and pushes the screen down. A shift landing between mousedown and mouseup
would send `click` to a common ancestor instead of the button.

Not reproduced on 2026-09-27: five full runs green, then 25 of 25 `--repeat-each` repetitions green
with four `yes` CPU hogs running.

## To reproduce

For shape 2, take a copy of the spec that logs capture-phase `mousedown`/`mouseup`/`click` targets and
coordinates, `hashchange`, and every change in the band's presence and `main`'s top edge, then prints
the log when the Profile assertion fails. The copy used on 2026-09-27 wraps lines 130–132 of the spec
in a `try` and installs the listeners with `page.evaluate` beforehand. It changes no product code.
Run it under `--repeat-each` and under load.

## Acceptance criteria

- [ ] Either shape reproduces with the evidence above captured, and its cause is named and fixed
- [ ] Or it is closed as not reproducible after a stated number of green full runs
- [ ] No test is loosened, skipped, retried into green, or given a larger timeout to absorb it
