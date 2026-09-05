# AGENTS.md — apps/desktop

These rules supplement the repo-wide [conventions](../../AGENTS.md) and the package rules in
[packages/AGENTS.md](../../packages/AGENTS.md). This is the Electron shell: the largest tree in the
repo, and the one most likely to be entered cold.

## Where things live

```
src/main/       the wiring layer — SQLite and the RPC channel
src/preload/    the context bridge, one file
src/renderer/   the React app
src/assets/     fonts and flags
test/           vitest unit and component specs
e2e/            Playwright specs, a separate suite with its own config
```

### `src/main/` — subsystems behind barrels

`index.ts` is the Electron entry and **must stay at exactly that path**; `vite.main.config.ts` pins
it. Everything else is a subsystem folder with an `index.ts` barrel:

| Folder | Owns |
|---|---|
| `rpc/` | the `handleRpc` dispatcher, the wide-event Logger it runs each call inside, keybinding overrides |
| `db/` | the drizzle schema and the generated migration artifacts |
| `world/` | world generation, league selection, saves, display names |
| `career/` | manager profile and status, staff, club selection, news |
| `club/` | squad, tactics, training, scouting, development, and the same decisions taken for AI clubs |
| `season/` | the calendar state machine, fixtures, matchday, cups, standings, rollover |
| `transfers/` | the transfer economy: economics, budgets, bids, AI behaviour, commands |
| `match/` | starting a match, its event stream, its view projections, its commands |

Two rules keep this shape honest:

- **Barrels are for external call sites only.** Inside `main/`, import the concrete file
  (`../club/squad.js`), never a sibling's barrel. Routing sibling folders through each other's
  barrels closes a `career → club → transfers → career` module-init cycle that ESM resolves lazily
  at runtime and no gate catches.
- **`db/schema.ts` must not move or be split.** `drizzle.config.ts` pins its exact path, and its
  file docstring asserts whole-schema invariants. Changing it forces `pnpm db:generate` and a
  gate-blocking regenerated-artifact diff.

Per [packages/AGENTS.md](../../packages/AGENTS.md), `src/main` is the wiring layer, **not a logic
home**. Pure, DB-free logic belongs in `packages/game-engine` or `packages/shared`. The one
exception is code that needs `Effect` or a branded id from `contracts`: `shared` has no
dependencies and `contracts` depends on `shared`, so moving such code there would recreate a cycle.

### `src/renderer/` — one folder per feature

Every screen lives in a feature folder (`squad/`, `transfers/`, `match/`, `leagueTable/`, ...).
Only genuinely cross-cutting files sit at the root: `main.tsx`, `rpc.ts`, `focus.ts`, `format.ts`,
`hotkeys.ts`, `theme.ts`, `window.d.ts`. If you are adding a screen, it gets a folder — a file at
the root reintroduces the two-schemes-at-once problem this layout removed.

`components/ui/` is vendored shadcn/Base UI, customized in place. Do not reorganize or reformat it.

**`scripts/effect-lint.ts` enforces a dependency boundary keyed on renderer file paths.** Screens
reach RPC only through `renderer/rpc`, and `react-hotkeys-hook` only through `renderer/hotkeys`;
those two seams are exempt by path. Moving a renderer file can therefore change whether the
boundary applies to it — `test/renderer-boundary-lint.test.ts` asserts specific paths and must move
with them.

## Specs that read source files by path

A few specs assert on file *contents* rather than behaviour, so typecheck cannot see the path and a
move must update the string by hand:

- `aiClubs` — reads `src/main/club/aiClubs.ts` to prove it never reaches the RPC edge.
- `career-chrome` — reads a screen source to prove it registers no `continue` handler.
- `display-names` — walks `src/main/` recursively, skipping `db/prototype-scale-probe`.

All read through `readFile`, which throws on a path that no longer resolves, so a broken path fails
loudly. The subtler hazard: these assertions are negative (`not.toContain`), so a path retargeted at
the *wrong but existing* file passes vacuously. After moving one, prove it still reads the bytes it
intends.

## Gates

Run `pnpm check:all` from the repo root, as everywhere in this repo. Two notes specific to here:

- **Typecheck covers `src`, `test`, `e2e` and `scripts`.** A move that breaks a spec's import fails
  `pnpm -r typecheck` in seconds. Use it as the inner loop; the full desktop suite takes ~16
  minutes.
- **`test/matchCommands.test.ts` is a known flake.** It seeds matches from `Date.now()` with no test
  hook and retries against a ~0.4% injury roll, so one or two of its tests fail intermittently. See
  [the filed issue](../../.scratch/desktop-suite-red/issues/02-injury-spec-is-wall-clock-seeded.md).
  Any other failure is real.
