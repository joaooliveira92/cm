# Sprint Plan

## Immediate next action

**group-g-match-day** ticket 23 (remount replays from kickoff),
24 (ungated halftime toggle), 25 (count edge cases), 26 (forced substitution brings back used
players); 20 needs triage (a command rewrites seen play); decision requests 01 (live tactics resets
the line-up) and 04 (who may come on) need a human;
then navbar-keyboard-intent 04 (a
decision first), then group-a-reconciliation 20 (the Quit dialog is hidden under router overlays),
then desktop-suite-red 14 (a flaky incoming-bids unit test).

group-g-match-day ticket 22 resolved 2026-09-16: score, head-count and the Commentary screen stop at
the revealed position, and `conditions` has left the match response. The head-count now visibly
disagrees with the engine after a live tactics change, which makes decision request 01 more urgent.

group-g-match-day ticket 21 resolved 2026-09-16: the injury prompt and no-subs pause work again,
triggered when the Injury line is revealed, decided on the cap state at that moment, and cleared by
the forced substitution, Play on, or a command. Desktop unit failures dropped from 68 to 62.

group-g-match-day ticket 19 resolved 2026-09-16: both substitution pickers list who is on the pitch
as of the revealed position, from a main-process fold (`pitch.ts`). Review found that the engine lets
a forced substitution bring back a dismissed player (26), and asked who may come on (decision
request 04).

group-g-match-day ticket 18 resolved 2026-09-16 (code in `d8170df`, committed outside the pipeline
and reviewed afterwards): live substitution counts stop at the revealed position, and "applied" comes
from the substitution's own event. desktop-suite-red 11 closed with it (live-match e2e 30/30). The
review found six more live-match defects, filed as group-g 20–25.

two-row-nav ticket 08 resolved 2026-09-16 (`d0e5f75`): secondary tablists are named for their match
or entity context, not the primary section. Its gate run exposed desktop-suite-red 14.

desktop-suite-red ticket 12 resolved 2026-09-16: Squad has a visually hidden `h1`, and `app.spec.ts`
is fully green. desktop-suite-red now has no ready ticket: 11 is blocked on group-g 18, and 03 is
claimed but abandoned.

desktop-suite-red ticket 13 resolved 2026-09-16: the transfer bid journey scopes its row locator, so a
namesake in a random world no longer breaks it (10/10 repeats).

desktop-suite-red ticket 11 parked 2026-09-16: no pacing seam, since the full-time race did not
reproduce in 30 runs. The remaining 1-in-30 failure is a product defect: live substitution counts
include substitutions the re-simulated match has not reached yet, so an accepted substitution can
read as Rejected. Filed as group-g 18 and 19. 11 is blocked on 18.

desktop-suite-red ticket 10 resolved 2026-09-16: the live-match specs assert today's command-status
copy and tabs. The app and journeys e2e specs are at 10 passed / 2 failed (tickets 12, 13).

desktop-suite-red ticket 09 resolved 2026-09-16: `closeOrKill` confirms the quit guard through main,
so an e2e app quits in about 150ms instead of being killed after 5s.

desktop-suite-red ticket 08 resolved 2026-09-16: the before-matchday seed now stands at the first
pre-match boundary, and the kickoff locators say "Play match". Router AC-15 and keyboard AC-20 pass.
The match-starting journeys now get past kickoff and fail on tickets 10 and 11.

desktop-suite-red ticket 07 resolved 2026-09-16: the close hang was the quit-confirmation guard that
no test answered, not an app defect. `keybindings.spec.ts` and the journeys save-restart test pass.

navbar-keyboard-intent ticket 03 resolved 2026-09-16: the keyboard, keybindings and journeys e2e
specs press position keys, and navbar badges follow user overrides. The keyboard e2e trio went from
3 passed / 7 failed to 5 / 5. The five left are desktop-suite-red 07 and 08, filed by its review.

navbar-keyboard-intent ticket 02 resolved 2026-09-16: World gains `g 8`, `g 3` now reaches Training
rather than Squad, and the section nav actions derive from `NAV_SECTIONS`, with `CAREER_G_BINDINGS`
deleted. `navbar.test.tsx`'s intentional red badge case is green. Report:
[reports/navbar-keyboard-intent.md](reports/navbar-keyboard-intent.md).

Group J ticket 08 resolved 2026-09-16: Contract Expiry and Budget Review are in the Recruitment
submenu (`g 4 o`, `g 4 p`), and the submenu strip now scrolls, since ten entries overflow the
default window. Group J has no ready ticket left; 04 is needs-info on decision request 01.

desktop-suite-red ticket 06 resolved 2026-09-16 (`d0fab20`): the career-screen classification is now
enforced by `typecheck` rather than by diligence, and the adapter sweep covers five destinations it
had been silently missing. It raised
[decision request 01](../.scratch/desktop-suite-red/decision-request-01-what-makes-a-career-destination-top-level.md)
— nothing written down says what makes a `CareerDestination` top-level, so the new guard forces a
classification without being able to check it. Blocks nothing.

Ticket 05 resolved 2026-09-16 (`0d0b60c`). Its premise was half wrong: `navbar.test.tsx`'s literal
was correct, not stale, and red because the navbar advertises a `g 8` the keyboard spine rejects.
That test is now derived from the binding registry and deliberately red against
[navbar-keyboard-intent 02](../.scratch/navbar-keyboard-intent/issues/02-world-section-advertises-a-dead-g-key.md).

Group J ticket 07 (Transfer History, Screen 146) resolved 2026-09-15 (`c7ad6bd`); it shipped a
navbar entry, which exposed that tickets 05 and 06 shipped their screens URL-only. Ticket 04
(Contract Renewal) is needs-info on group-j decision request 01 (renewal mid-term), its work kept as
a patch. Group J decision request 02 (club-scoped transfer indexes) is open and blocks nothing.
Group I decision request 01 also blocks Group J Screens 132, 134 and 137.

**For a human**: `desktop-suite-red` ticket 03 is claimed-and-abandoned. Per
[AGENTS.md](../AGENTS.md), `claimed` is a lock the frontier scan skips, so it is invisible to every
future agent and will never be picked up. It needs unclaiming or closing by someone who knows why it
stopped. Tickets currently `claimed` elsewhere (group-a 03, group-g 14, group-h 11) may be live
parallel sessions and were left alone.

## Gate state (2026-09-14)

- **Ticket 05 (group-h) gate, 2026-09-15**: `pnpm check:all` exits 1 on pre-existing failures only.
  The same failing files on clean HEAD `349bafc` give 69 failures, identical to the working tree's
  apart from one caused by another session's uncommitted content pack. e2e on clean HEAD is
  10 failed / 24 passed, so the 5-failure e2e baseline below is out of date. Details in
  [reports/group-h-training-and-player-development.md](reports/group-h-training-and-player-development.md).

- **Ticket 07 (group-g) gate**: `pnpm check:all` exits 1 on pre-existing failures only. Desktop unit
  tests 65 failed / 1516 passed across 20 files; the same 20 files on clean HEAD fail the same 65.
  `verify-md-links` fails on 18 links in `.scratch/group-c-club-information/RECONCILIATION.md` and
  `.scratch/group-d-player-and-staff-records/issues/02-staff-screens-scope.md`, both committed earlier.
  Details in [reports/group-g-match-day.md](reports/group-g-match-day.md).

- **`pnpm check:all`**: pre-existing failures only — no regression from today's work (commits
  `b0b8f33`, `d6b44a4`, `ac553d6`, `6a07401`, `6a830f3`, `908fd0f`, `e6f0c6f`, `dd46e8d`,
  `f52c2c6`):
  - `test/renderer/managerProfile/screen.test.tsx` — mock RPC returns "unexpected response"
  - `test/renderer/chrome/shell-bottom-bar-state.test.ts` — expected `zones` mismatch
  - `test/renderer/navigation/navbar.test.tsx` and `route-index.test.ts` — route content mismatch
  - `test/renderer/router/stage2.test.ts`, `team-scout-report-route.test.ts` — `window` not defined
    (jsdom env)
  - `test/renderer/match/screen-fulltime.test.tsx` — passes.
- **Desktop unit tests, 2026-09-16 (navbar-keyboard-intent 02)**: 68 failed / 1792 passed across 17
  files. `navbar.test.tsx` no longer fails. The e2e keyboard specs fail on the retired letter keys
  (ticket 03), and `router.spec.ts:184` (Match Day resume) fails on a missing `Start match` button.
- **Nav guard baseline, 2026-09-16 (`d0fab20`)**: `test/renderer/navigation` + `test/renderer/actions`
  is 1 failed / 355 passed across 14 files — the one failure still the intentional `navbar.test.tsx`
  badge case. Earlier the same day at `0d0b60c`: `test/renderer/navigation` is 1 failed / 307
  passed across 11 files. The one failure is intentional — `navbar.test.tsx`'s badge case is red
  until navbar-keyboard-intent 02 resolves the `g 8` gap. Before this ticket the same two files
  failed 2. Details in [reports/desktop-suite-red.md](reports/desktop-suite-red.md).
- **e2e**: still 5 failed / 28 passed at `8f95c8f` — no e2e change this sprint.
- **typecheck**: 0 errors across all packages.
- **lint/oxlint**: pre-existing warnings only.

## Queue

1. ~~**group-c-club-information**: complete 2026-09-14. Screen 38 already shipped.~~
2. ~~**group-d-player-and-staff-records**: complete 2026-09-14. 19 screens charted, 3 implemented.~~
3. **desktop-suite-red**: 01, 02, 04, 05, 06 resolved (05 derived the nav guards, 06 made the
    classification a typecheck gate, 2026-09-16). 03 claimed-and-abandoned (needs a human to
    unclaim or close). Decision request 01 open. 07-10 resolved 2026-09-16 (quit guard; seed at the
    pre-match boundary; graceful harness close; live-match copy). 11 blocked by group-g 18; 12, 13 resolved
    (hidden Squad `h1`; namesake-safe bid locator).
4. **season-rollover-skips-conclusion**: 01 resolved.
5. **match-composition**: 01-02 resolved.
6. **group-a-reconciliation**: 03-04 resolved. 20 ready (Quit dialog hidden under router overlays, filed 2026-09-16).
7. **team-scout-report**: complete 2026-09-13.
8. **group-e-squad-management**: pending — next unmatched spec group.
9. **group-g-match-day**: 01–09 resolved (07 Screen 97 live tactics/substitutions, 08 Screen 99
    Post-Match Summary, 09 Screens 95/100 Match Statistics, 11 Screen 103 Match Report, 2026-09-14);
    10 needs-info on decision request 03; 12, 13, 15, 16, 17 resolved; 14 claimed; 13 mounted tab bar,
    17 stoppage minute formatting shipped 2026-09-15; decision requests 01, 02, 03 open.
10. **group-h-training-and-player-development**: 01-03 resolved. Spec published. 04 completed
    (coaching assignments, 2026-09-15). 05 completed (workload and recovery, 2026-09-15). 06 completed
    (individual training plan, 2026-09-15). 07 partly shipped (performance report, 2026-09-15),
    needs-info on decision requests 01 (coach rating) and 02 (development baseline). 08 completed
    (player development centre, 2026-09-15). 09 completed (training overview, 2026-09-15). 10 completed
    (Goalkeeping Training Focus rule enforced in main, 2026-09-15). 11 claimed.
11. **group-i-scouting-and-recruitment**: 01-03 resolved, spec published. 07 completed (typed RPC
    errors survive IPC), 04 completed (Scouting Assignment screen) and 05 completed (Scouting
    Knowledge screen), 06 completed (Scouting Centre), 2026-09-15. 08 completed (read-state
    helper), 2026-09-15. Scope note promoted. Effort complete for v1; decision request 01 open. Decision request 01 open.
12. **group-j-transfers-contracts-and-negotiations**: 01-03 resolved, spec published (2026-09-15). 04
    needs-info on decision request 01; 05-07 resolved (07 Screen 146 Transfer History, 2026-09-15);
    08 resolved (navbar entries for 141/145, 2026-09-16). Decision requests 01 and 02 open.
13. **navbar-keyboard-intent**: 01-03 resolved (02 World `g 8`; 03 e2e on position keys, override-aware
    badges, 2026-09-16); 04 ready (decision: item level vs hand-edited section overrides).

Shipped and closed:

- **club-staff-presence**: complete 2026-09-09.
- **save-list-error-handling**: complete 2026-09-09.
- **world-data-model**: shipped.
- **group-b-reconciliation**: all 7 tickets resolved.
- **group-c-club-information**: complete 2026-09-14.
- **group-d-player-and-staff-records**: complete 2026-09-14.
- **group-e-squad-management**: complete 2026-09-14. 11 screens charted, all disposed.

## Loose instructions

Squad work committed from `.scratch/squad-instructions.md` (`6a04f33`…`5663faf`) is not a
`.scratch/<effort>/` and has no tracker entry. Whether to charter it is a human call.
