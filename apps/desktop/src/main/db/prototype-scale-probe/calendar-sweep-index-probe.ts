/**
 * PROTOTYPE — THROWAWAY. Measures the one thing open question 20 asks for and nothing else:
 * what the date-bearing advance's sweep costs at world scale, and whether an index on
 * `scheduled_date` — alone, or paired with `played` — is worth its write cost.
 *
 * Deliberately not an extension of `probe.ts`, for the reason `player-transfers-key-probe.ts`
 * gives: that harness measures a DDL that has since moved on. This builds one season of the real
 * `fixtures` shape at the probe's representative world and plays it through, matchday by matchday,
 * because the sweep's selectivity is not constant — early in a season almost every row is unplayed
 * and the date predicate is what narrows; late in a season almost none is, and the played predicate
 * is. A single reading at one point in the season would answer the wrong question.
 *
 * Run: pnpm tsx apps/desktop/src/main/db/prototype-scale-probe/calendar-sweep-index-probe.ts
 * Writes ./PROTOTYPE-wipe-me-sweep-*.sqlite next to itself.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The probe's documented ceiling: 16,000 clubs in 800 twenty-club competitions. */
const COMPETITIONS = 800;
const CLUBS_PER_COMPETITION = 20;
const ROUNDS = 38;
/** 800 x 380 = 304,000 league fixtures in the live season. */
const FIXTURES_PER_SEASON = COMPETITIONS * ((CLUBS_PER_COMPETITION - 1) * 2 * (CLUBS_PER_COMPETITION / 2));

/**
 * Ticket 18 prunes every past season except the competitions the human played in, so the table does
 * not grow with the save: twenty seasons leaves one live season plus the human's own history.
 */
const RETAINED_SEASONS = 19;
const RETAINED_PER_SEASON = 380 + 8;

/** The playable competition is the human's own; the rest resolve without stopping the advance. */
const PLAYABLE_COMPETITION = 0;

const time = <A>(f: () => A): [A, number] => {
  const t0 = Number(process.hrtime.bigint());
  const a = f();
  return [a, (Number(process.hrtime.bigint()) - t0) / 1e6];
};

const competitionId = (n: number) => `n${String(Math.floor(n / 8)).padStart(3, "0")}_tier_${(n % 8) + 1}`;
const clubId = (competition: number, ordinal: number) =>
  `${competitionId(competition)}_c${String(ordinal).padStart(2, "0")}`;

/** One shared slot template: every competition plays its round r on the same date (ticket 01). */
const dateForRound = (round: number): string => {
  const start = Date.UTC(2026, 7, 8);
  const d = new Date(start + round * 7 * 86_400_000);
  return d.toISOString().slice(0, 10);
};

interface Candidate {
  readonly label: string;
  readonly indexes: ReadonlyArray<string>;
}

/** The shipping index from the spec is present in every candidate: it is not up for reconsideration. */
const SHIPPING = "CREATE INDEX fixtures_competition_season_played_idx ON fixtures (competition_id, season_number, played)";

const CANDIDATES: ReadonlyArray<Candidate> = [
  { label: "shipping-index-only", indexes: [SHIPPING] },
  {
    label: "plus-date",
    indexes: [SHIPPING, "CREATE INDEX fixtures_scheduled_date_idx ON fixtures (scheduled_date)"],
  },
  {
    label: "plus-date-played",
    indexes: [SHIPPING, "CREATE INDEX fixtures_scheduled_date_played_idx ON fixtures (scheduled_date, played)"],
  },
  {
    label: "plus-played-date",
    indexes: [SHIPPING, "CREATE INDEX fixtures_played_scheduled_date_idx ON fixtures (played, scheduled_date)"],
  },
];

const FIXTURES_DDL = `CREATE TABLE fixtures (
  id integer PRIMARY KEY NOT NULL,
  season_number integer NOT NULL,
  competition_id text NOT NULL,
  round integer NOT NULL,
  scheduled_date text NOT NULL,
  home_club_id text NOT NULL,
  away_club_id text NOT NULL,
  home_goals integer,
  away_goals integer,
  home_penalties integer,
  away_penalties integer,
  played integer DEFAULT 0 NOT NULL,
  CONSTRAINT "fixtures_round" CHECK(round >= 1),
  CONSTRAINT "fixtures_played" CHECK(played IN (0,1)),
  CONSTRAINT "fixtures_penalties_paired" CHECK((home_penalties IS NULL) = (away_penalties IS NULL))
)`;

const COMPETITIONS_DDL = `CREATE TABLE competitions (
  id text PRIMARY KEY NOT NULL,
  nation_id text,
  kind text NOT NULL,
  tier integer,
  depth text NOT NULL,
  club_count integer
)`;

/** The real sweep, from `resolveThroughDate` in `season.ts`. */
const SWEEP = `SELECT f.id, f.home_club_id, f.away_club_id, f.season_number, f.competition_id, f.round, c.depth, c.kind
  FROM fixtures f
  JOIN competitions c ON c.id = f.competition_id
  WHERE f.played = 0 AND f.scheduled_date <= ?
  ORDER BY f.scheduled_date ASC, f.id ASC`;

/** The real horizon reads, from `loadCalendarHorizon`. */
const HORIZON_NEXT = `SELECT MIN(f.scheduled_date) as date
  FROM fixtures f JOIN competitions c ON c.id = f.competition_id
  WHERE f.played = 0 AND f.scheduled_date > ? AND c.depth = 'standard'`;
const HORIZON_LAST = `SELECT MAX(scheduled_date) as date FROM fixtures WHERE played = 0`;

const build = (candidate: Candidate) => {
  const file = path.join(HERE, `PROTOTYPE-wipe-me-sweep-${candidate.label}.sqlite`);
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    if (existsSync(file + suffix)) unlinkSync(file + suffix);
  }

  const db = new DatabaseSync(file);
  db.exec(COMPETITIONS_DDL);
  db.exec(FIXTURES_DDL);

  const insertCompetition = db.prepare(
    `INSERT INTO competitions (id, nation_id, kind, tier, depth, club_count) VALUES (?,?,?,?,?,?)`,
  );
  const insertFixture = db.prepare(
    `INSERT INTO fixtures (id, season_number, competition_id, round, scheduled_date, home_club_id, away_club_id, home_goals, away_goals, home_penalties, away_penalties, played)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );

  db.exec("BEGIN");
  for (let c = 0; c < COMPETITIONS; c += 1) {
    insertCompetition.run(
      competitionId(c),
      `n${String(Math.floor(c / 8)).padStart(3, "0")}`,
      "league",
      (c % 8) + 1,
      c === PLAYABLE_COMPETITION ? "standard" : "results-only",
      CLUBS_PER_COMPETITION,
    );
  }

  // The live season: a double round-robin per competition, every competition on the shared slots.
  let id = 0;
  for (let c = 0; c < COMPETITIONS; c += 1) {
    for (let round = 1; round <= ROUNDS; round += 1) {
      const date = dateForRound(round);
      for (let pairing = 0; pairing < CLUBS_PER_COMPETITION / 2; pairing += 1) {
        id += 1;
        const home = (round + pairing) % CLUBS_PER_COMPETITION;
        const away = (round + CLUBS_PER_COMPETITION - pairing - 1) % CLUBS_PER_COMPETITION;
        insertFixture.run(id, 20, competitionId(c), round, date, clubId(c, home), clubId(c, away), null, null, null, null, 0);
      }
    }
  }

  // The human's retained history: nineteen past seasons of their own competition, all played.
  for (let season = 1; season <= RETAINED_SEASONS; season += 1) {
    for (let n = 0; n < RETAINED_PER_SEASON; n += 1) {
      id += 1;
      const round = (n % ROUNDS) + 1;
      insertFixture.run(
        id, season, competitionId(PLAYABLE_COMPETITION), round, dateForRound(round),
        clubId(PLAYABLE_COMPETITION, n % CLUBS_PER_COMPETITION),
        clubId(PLAYABLE_COMPETITION, (n + 1) % CLUBS_PER_COMPETITION),
        1, 1, null, null, 1,
      );
    }
  }
  db.exec("COMMIT");

  const [, indexMs] = time(() => {
    for (const ddl of candidate.indexes) db.exec(ddl);
  });
  db.close();

  return { file, bytes: statSync(file).size, rows: id, indexMs };
};

const measure = (candidate: Candidate) => {
  const { file, bytes, rows, indexMs } = build(candidate);

  // Reopen cold, so the page cache is not carrying the write working set.
  const db = new DatabaseSync(file);
  const sweep = db.prepare(SWEEP);
  const horizonNext = db.prepare(HORIZON_NEXT);
  const horizonLast = db.prepare(HORIZON_LAST);
  const markPlayed = db.prepare(`UPDATE fixtures SET home_goals = ?, away_goals = ?, played = 1 WHERE id = ?`);

  const planFor = (query: string, ...args: ReadonlyArray<string>) =>
    (db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...args) as Array<{ detail: string }>)
      .map((r) => r.detail)
      .join(" | ");

  const sweepPlan = planFor(SWEEP, dateForRound(1));
  const horizonPlan = planFor(HORIZON_NEXT, dateForRound(1));

  // Play the season the way a Continue does: sweep to the next matchday, resolve everything it
  // returns, mark it played, repeat. Both halves are timed — the read is what an index buys and the
  // write is what it costs.
  const sweepMs: Array<number> = [];
  const writeMs: Array<number> = [];
  const horizonMs: Array<number> = [];
  let swept = 0;

  for (let round = 1; round <= ROUNDS; round += 1) {
    const date = dateForRound(round);
    const [due, readMs] = time(() => sweep.all(date) as Array<{ id: number }>);
    sweepMs.push(readMs);
    swept += due.length;

    const [, updateMs] = time(() => {
      db.exec("BEGIN");
      for (const fixture of due) markPlayed.run(1, 0, fixture.id);
      db.exec("COMMIT");
    });
    writeMs.push(updateMs);

    const [, hMs] = time(() => {
      horizonNext.get(date);
      horizonLast.get();
    });
    horizonMs.push(hMs);
  }

  db.close();

  const total = (xs: ReadonlyArray<number>) => xs.reduce((a, b) => a + b, 0);
  return {
    label: candidate.label,
    rows,
    megabytes: bytes / 1024 / 1024,
    indexMs,
    sweptRows: swept,
    sweepTotalMs: total(sweepMs),
    sweepFirstMs: sweepMs[0]!,
    sweepMidMs: sweepMs[Math.floor(ROUNDS / 2)]!,
    sweepLastMs: sweepMs[ROUNDS - 1]!,
    writeTotalMs: total(writeMs),
    horizonTotalMs: total(horizonMs),
    sweepPlan,
    horizonPlan,
  };
};

console.log(
  `calendar sweep index probe — ${COMPETITIONS} competitions, ${FIXTURES_PER_SEASON.toLocaleString()} live fixtures, ` +
    `${(RETAINED_SEASONS * RETAINED_PER_SEASON).toLocaleString()} retained, ${ROUNDS} matchdays played through\n`,
);

for (const candidate of CANDIDATES) {
  const r = measure(candidate);
  console.log(r.label);
  console.log(`  rows              ${r.rows.toLocaleString()}`);
  console.log(`  file              ${r.megabytes.toFixed(1)} MB`);
  console.log(`  index build       ${r.indexMs.toFixed(0)} ms`);
  console.log(`  sweep / season    ${r.sweepTotalMs.toFixed(0)} ms over ${ROUNDS} advances (${r.sweptRows.toLocaleString()} rows returned)`);
  console.log(`  sweep md 1/19/38  ${r.sweepFirstMs.toFixed(1)} / ${r.sweepMidMs.toFixed(1)} / ${r.sweepLastMs.toFixed(1)} ms`);
  console.log(`  mark-played /szn  ${r.writeTotalMs.toFixed(0)} ms`);
  console.log(`  horizon / season  ${r.horizonTotalMs.toFixed(0)} ms`);
  console.log(`  sweep plan        ${r.sweepPlan}`);
  console.log(`  horizon plan      ${r.horizonPlan}\n`);
}
