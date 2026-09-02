# 11: Simulation Depth collapses on disk to has-a-squad or not

**What to build:** a large world advances without seconds of freeze, and a nation the player cannot
see into still behaves like a football nation. A `results-only` competition has a full fixture list
and a real final table, but its clubs have no players: a fixture there resolves from a single derived
strength number rather than by simulating ninety minutes. That is the whole point of the tier — one
match simulation is about a millisecond, and a sixteen-thousand-club world would otherwise cost about
eight seconds of blocking work on every Continue.

A `standard` club holds exactly what a `full` club holds, byte for byte, so a club becoming
manageable needs no conversion. Depth's entire footprint on disk is the presence or absence of rows
in the five tables beneath a club: players, their positions, their contracts, their fitness, and the
club's tactic. No column on the club row is Depth-conditional — a `results-only` club has the same
columns and the same hometown as any other.

Results Strength is one 1-100 number derived on read from the world seed, the club id, its Stature
Tier, its competition's tier and nation prior, and the season number, calibrated against measured
squads. It is never a column. A `results-only` league must not be won by the same club every season,
so a background nation has a story. Effective Depth is likewise derived, from participant rows
joined to the competition's depth, and is never stored on the club.

The slice's edge promise: resolving a fixture is one effect whose caller cannot tell which arm ran.
Depth decides how a fixture resolves and never whether it exists, so no caller branches on Depth and
no new failure enters the error channel.

**Decisions:**

- `results-only` ships, justified solely on recurring per-matchday simulation cost (~1.0 ms per
  fixture, measured); `full` and `standard` are byte-identical on disk; and Results Strength is one
  1-100 number derived on read, never a stored column. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-01-simulation-depth-persistence.md).
- Simulation Depth never conditions the world catalogue or the club row — a `results-only` nation
  keeps its cities, and `cities` widens further to unconditional across the catalogue, matching
  `nations`. See
  [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-02-results-only-geography-cost.md).

**Blocked by:** 06, 10.

**Status:** ready-for-agent

**Files:** `apps/desktop/src/main/worldGeneration.ts`, `apps/desktop/src/main/season.ts` (fixture
resolution), a results-strength module in `packages/shared/src`,
`apps/desktop/src/main/aiClubs.ts` and `apps/desktop/src/main/development.ts` (per-club sweeps must
skip clubs with no squad), `apps/desktop/test/season.test.ts`,
`apps/desktop/test/create-generation.test.ts`.

- [ ] A `results-only` club has zero rows in players, player positions, contracts, player fitness,
      and tactics, and an otherwise identical club row — hometown included — to a `full` club of the
      same id. A test asserts both halves.
- [ ] No table is written for a `full` club that is not written for a `standard` club, and a test
      asserts it.
- [ ] Results Strength is computed on read from the stated inputs; no column named for club strength
      exists anywhere, and a test asserts the per-Stature-Tier bands reproduce the measured squad
      calibration.
- [ ] A `results-only` league resolves a full season of fixtures without invoking the match engine,
      and a test asserts it does not return the same champion every season under a fixed seed.
- [ ] Effective Depth is derived from participant rows joined to the competition's depth; no column
      on the club row stores it.
- [ ] Every world-wide per-club sweep tolerates a club with no squad without special-casing Depth.
- [ ] `pnpm check:all` is green at this commit.
