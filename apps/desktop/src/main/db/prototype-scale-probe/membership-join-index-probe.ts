/**
 * PROTOTYPE — THROWAWAY. Measures the one thing open question 21 asks for and nothing else: what
 * the club-keyed membership read costs at world scale, how often it actually runs, and whether an
 * index leading on the club is worth its write cost.
 *
 * The participant key's `(competition_id, season_number)` prefix serves every competition-keyed
 * read. The club-keyed read — which competition is this club in this season — has no covering
 * prefix. `clubStrength` in `season.ts` is that read, and `resolveFixtureScore` calls it once per
 * side of every fixture where either club cannot field eleven, which at world scale is every
 * results-only fixture in the world. So the frequency is a per-Continue number, not a per-screen
 * one, and this probe measures it at that frequency.
 *
 * Two ages are measured because participant rows are never pruned — ticket 18 prunes fixtures, not
 * these — so the table grows linearly with the life of the save.
 *
 * Run: pnpm tsx apps/desktop/src/main/db/prototype-scale-probe/membership-join-index-probe.ts
 * Writes ./PROTOTYPE-wipe-me-membership-*.sqlite next to itself.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The probe's documented ceiling: 16,000 clubs in 800 twenty-club competitions. */
const COMPETITIONS = 800;
const CLUBS_PER_COMPETITION = 20;
const CLUBS = COMPETITIONS * CLUBS_PER_COMPETITION;

/** Season 1 is the first-season save; season 20 is the same save two decades on. */
const AGES = [1, 20] as const;

/**
 * One results-only fixture costs two club-keyed reads, and a matchday resolves ten fixtures in each
 * of 799 results-only competitions. So a single Continue makes this call ~16,000 times.
 */
const CALLS_PER_CONTINUE = (COMPETITIONS - 1) * (CLUBS_PER_COMPETITION / 2) * 2;

let seed = 987_654;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const time = <A>(f: () => A): [A, number] => {
  const t0 = Number(process.hrtime.bigint());
  const a = f();
  return [a, (Number(process.hrtime.bigint()) - t0) / 1e6];
};

const competitionId = (n: number) => `n${String(Math.floor(n / 8)).padStart(3, "0")}_tier_${(n % 8) + 1}`;
const clubId = (competition: number, ordinal: number) =>
  `${competitionId(competition)}_c${String(ordinal).padStart(2, "0")}`;

const CLUBS_DDL = `CREATE TABLE clubs (
  id text PRIMARY KEY NOT NULL,
  stature_tier text NOT NULL,
  is_user_club integer DEFAULT 0 NOT NULL,
  generation_seed integer NOT NULL,
  city_id text NOT NULL,
  stadium_name text NOT NULL,
  stadium_capacity integer NOT NULL,
  CONSTRAINT "clubs_stature_tier" CHECK(stature_tier IN ('big','mid','small')),
  CONSTRAINT "clubs_is_user_club" CHECK(is_user_club IN (0,1))
)`;

const COMPETITIONS_DDL = `CREATE TABLE competitions (
  id text PRIMARY KEY NOT NULL,
  nation_id text,
  kind text NOT NULL,
  tier integer,
  depth text NOT NULL,
  club_count integer
)`;

const PARTICIPANTS_DDL = `CREATE TABLE competition_participants (
  competition_id text NOT NULL,
  season_number integer NOT NULL,
  club_id text NOT NULL,
  final_position integer,
  points integer,
  goal_difference integer,
  goals_for integer,
  PRIMARY KEY(competition_id, season_number, club_id),
  CONSTRAINT "competition_participants_season_number" CHECK(season_number >= 1),
  CONSTRAINT "competition_participants_final_position" CHECK(final_position IS NULL OR final_position >= 1)
)`;

/** The hot read: `clubStrength` in `season.ts`, verbatim in shape. */
const STRENGTH_READ = `SELECT c.stature_tier, comp.tier, comp.nation_id
  FROM clubs c
  JOIN competition_participants cp ON cp.club_id = c.id AND cp.season_number = ?
  JOIN competitions comp ON comp.id = cp.competition_id
  WHERE c.id = ?`;

/** The other read with no competition prefix: `loadHumanCompetitionId`, once per season. */
const HUMAN_READ = `SELECT cp.competition_id
  FROM competition_participants cp
  JOIN clubs c ON c.id = cp.club_id
  WHERE cp.season_number = ? AND c.is_user_club = 1
  LIMIT 1`;

interface Candidate {
  readonly label: string;
  readonly index: string | null;
}

const CANDIDATES: ReadonlyArray<Candidate> = [
  { label: "primary-key-only", index: null },
  { label: "plus-club", index: "CREATE INDEX cp_club_idx ON competition_participants (club_id)" },
  {
    label: "plus-club-season",
    index: "CREATE INDEX cp_club_season_idx ON competition_participants (club_id, season_number)",
  },
];

const build = (candidate: Candidate, seasons: number) => {
  const file = path.join(HERE, `PROTOTYPE-wipe-me-membership-${candidate.label}-s${seasons}.sqlite`);
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    if (existsSync(file + suffix)) unlinkSync(file + suffix);
  }

  const db = new DatabaseSync(file);
  db.exec(CLUBS_DDL);
  db.exec(COMPETITIONS_DDL);
  db.exec(PARTICIPANTS_DDL);

  const insertClub = db.prepare(
    `INSERT INTO clubs (id, stature_tier, is_user_club, generation_seed, city_id, stadium_name, stadium_capacity) VALUES (?,?,?,?,?,?,?)`,
  );
  const insertCompetition = db.prepare(
    `INSERT INTO competitions (id, nation_id, kind, tier, depth, club_count) VALUES (?,?,?,?,?,?)`,
  );
  const insertParticipant = db.prepare(
    `INSERT OR IGNORE INTO competition_participants (competition_id, season_number, club_id, final_position, points, goal_difference, goals_for) VALUES (?,?,?,?,?,?,?)`,
  );

  db.exec("BEGIN");
  for (let c = 0; c < COMPETITIONS; c += 1) {
    insertCompetition.run(
      competitionId(c),
      `n${String(Math.floor(c / 8)).padStart(3, "0")}`,
      "league",
      (c % 8) + 1,
      c === 0 ? "standard" : "results-only",
      CLUBS_PER_COMPETITION,
    );
    for (let o = 0; o < CLUBS_PER_COMPETITION; o += 1) {
      insertClub.run(
        clubId(c, o),
        ["big", "mid", "small"][o % 3]!,
        c === 0 && o === 0 ? 1 : 0,
        Math.floor(rnd() * 4_294_967_295),
        `city_${c % 400}`,
        `Ground ${c}-${o}`,
        10_000 + Math.floor(rnd() * 50_000),
      );
    }
  }

  // Promotion and relegation shuffle a club between competitions across seasons, so a club-keyed
  // read after twenty seasons is looking for one row among twenty scattered ones, not a run.
  for (let season = 1; season <= seasons; season += 1) {
    for (let c = 0; c < COMPETITIONS; c += 1) {
      for (let o = 0; o < CLUBS_PER_COMPETITION; o += 1) {
        // A club drifts a tier every few seasons; the id it was minted under never changes.
        const drift = season === 1 ? 0 : Math.floor(rnd() * 3) - 1;
        const home = Math.min(COMPETITIONS - 1, Math.max(0, c + drift));
        insertParticipant.run(
          competitionId(home),
          season,
          clubId(c, o),
          season === seasons ? null : 1 + (o % CLUBS_PER_COMPETITION),
          season === seasons ? null : Math.floor(rnd() * 100),
          season === seasons ? null : Math.floor(rnd() * 60) - 30,
          season === seasons ? null : Math.floor(rnd() * 90),
        );
      }
    }
  }
  db.exec("COMMIT");

  const [, indexMs] = time(() => {
    if (candidate.index !== null) db.exec(candidate.index);
  });
  const rows = (db.prepare(`SELECT count(*) n FROM competition_participants`).get() as { n: number }).n;
  db.close();

  return { file, bytes: statSync(file).size, rows, indexMs };
};

const measure = (candidate: Candidate, seasons: number) => {
  const { file, bytes, rows, indexMs } = build(candidate, seasons);

  // Reopen cold, so the page cache is not carrying the write working set.
  const db = new DatabaseSync(file);
  const strength = db.prepare(STRENGTH_READ);
  const human = db.prepare(HUMAN_READ);

  const plan = (query: string, ...args: ReadonlyArray<string | number>) =>
    (db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(...args) as Array<{ detail: string }>)
      .map((r) => r.detail)
      .join(" | ");

  const strengthPlan = plan(STRENGTH_READ, seasons, clubId(1, 1));
  const humanPlan = plan(HUMAN_READ, seasons);

  // One Continue: both sides of every results-only fixture on the matchday.
  const targets: Array<string> = [];
  for (let n = 0; n < CALLS_PER_CONTINUE; n += 1) {
    targets.push(clubId(1 + (n % (COMPETITIONS - 1)), n % CLUBS_PER_COMPETITION));
  }

  // Warm one call so the first reading is not paying for the statement's first-use setup.
  strength.all(seasons, targets[0]!);
  const [, continueMs] = time(() => {
    for (const target of targets) strength.all(seasons, target);
  });
  const [, humanMs] = time(() => human.get(seasons));

  db.close();
  return {
    label: candidate.label,
    seasons,
    rows,
    megabytes: bytes / 1024 / 1024,
    indexMs,
    perCallMs: continueMs / targets.length,
    continueMs,
    humanMs,
    strengthPlan,
    humanPlan,
  };
};

console.log(
  `membership join index probe — ${CLUBS.toLocaleString()} clubs, ${COMPETITIONS} competitions, ` +
    `${CALLS_PER_CONTINUE.toLocaleString()} club-keyed reads per Continue\n`,
);

for (const seasons of AGES) {
  console.log(`=== after ${seasons} season${seasons === 1 ? "" : "s"} ===\n`);
  for (const candidate of CANDIDATES) {
    const r = measure(candidate, seasons);
    console.log(r.label);
    console.log(`  participant rows  ${r.rows.toLocaleString()}`);
    console.log(`  file              ${r.megabytes.toFixed(1)} MB`);
    console.log(`  index build       ${r.indexMs.toFixed(0)} ms`);
    console.log(`  per call          ${r.perCallMs.toFixed(4)} ms`);
    console.log(`  per Continue      ${(r.continueMs / 1000).toFixed(2)} s`);
    console.log(`  human-club read   ${r.humanMs.toFixed(2)} ms (once per season)`);
    console.log(`  plan              ${r.strengthPlan}`);
    console.log(`  human plan        ${r.humanPlan}\n`);
  }
}
