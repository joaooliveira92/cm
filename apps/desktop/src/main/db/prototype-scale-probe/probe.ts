/**
 * PROTOTYPE — THROWAWAY. Wayfinder ticket 04 (.scratch/world-data-model/issues/04-sqlite-scale-probe.md).
 *
 * Measures what a multi-nation save actually costs on disk and on read, using the real DDL from
 * `migrations.generated.ts` and the real driver (`node:sqlite`, what @effect/sql-sqlite-node v4 uses).
 *
 * Run: pnpm tsx apps/desktop/src/main/db/prototype-scale-probe/probe.ts
 * Writes ./PROTOTYPE-wipe-me-*.sqlite next to itself. Delete the directory when ticket 04 resolves.
 */
import { DatabaseSync } from "node:sqlite";
import { statSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MIGRATION_STATEMENTS } from "../migrations.generated.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** node:sqlite hands back untyped rows; the probe only ever reads a handful of known columns. */
type Row = Record<string, string | number | null>;
const asRows = (rows: readonly unknown[]): Row[] => rows as Row[];
const asRow = (row: unknown): Row => row as Row;
const SQUAD_SIZE = 25;
const CLUBS_PER_LEAGUE = 20;

// Deterministic cheap RNG — the probe measures storage, not generation realism.
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const attr = () => 1 + Math.floor(rnd() * 20);

/** The real id shape: a 36-char UUID-format string (see `deriveId` in packages/game-engine/src/seed.ts). */
const hex = (n: number, w: number) => (n >>> 0).toString(16).padStart(w, "0").slice(-w);
let idCounter = 0;
const makeId = () => {
  const n = ++idCounter;
  return `${hex(n, 8)}-${hex(n * 7, 4)}-4${hex(n * 13, 3)}-8${hex(n * 17, 3)}-${hex(n * 19, 12)}`;
};

const POSITIONS = ["GK", "DC", "DL", "DR", "DM", "MC", "ML", "MR", "AMC", "ST"] as const;
const FAMILIARITIES = ["natural", "competent", "unfamiliar"] as const;
const FIRST = ["James", "Marco", "Luis", "Antoine", "Kenji", "Piotr", "Diego", "Nils", "Ahmed", "Tomas"];
const LAST = ["Wilson", "Rossi", "Garcia", "Dubois", "Tanaka", "Kowalski", "Silva", "Andersen", "Hassan", "Novak"];

const time = <A>(label: string, f: () => A): [A, number] => {
  const t0 = Number(process.hrtime.bigint());
  const a = f();
  return [a, (Number(process.hrtime.bigint()) - t0) / 1e6];
};

interface Scenario { readonly label: string; readonly players: number; readonly withIndexes: boolean }

const REUSE = process.argv.includes("--reuse");

const generate = (file: string, targetPlayers: number, withIndexes: boolean) => {
  if (REUSE && existsSync(file)) {
    const db = new DatabaseSync(file);
    const one = (q: string) => asRow(db.prepare(q).get()).n as number;
    const clubIds = asRows(db.prepare("SELECT id FROM clubs").all()).map((r) => r.id as string);
    return {
      db, clubIds, clubCount: clubIds.length,
      fixtureCount: one("SELECT count(*) n FROM fixtures"),
      eventCount: one("SELECT count(*) n FROM events"),
      genMs: Number.NaN,
    };
  }
  if (existsSync(file)) unlinkSync(file);
  for (const suffix of ["-journal", "-wal", "-shm"]) if (existsSync(file + suffix)) unlinkSync(file + suffix);

  const db = new DatabaseSync(file);
  // No PRAGMA appears anywhere in apps/desktop/src, so the app runs SQLite defaults. Match that.
  for (const stmt of MIGRATION_STATEMENTS) db.exec(stmt);

  if (withIndexes) {
    db.exec("CREATE INDEX idx_players_club ON players(club_id)");
    db.exec("CREATE INDEX idx_fixtures_season ON fixtures(season_number, played)");
    db.exec("CREATE INDEX idx_contracts_player ON contracts(player_id)");
  }

  const clubCount = Math.ceil(targetPlayers / SQUAD_SIZE);
  const t0 = Number(process.hrtime.bigint());

  db.exec("BEGIN");
  db.prepare(`INSERT INTO save_meta (id,name,created_at) VALUES (?,?,?)`).run("save-1", "probe", "2026-09-01");
  db.prepare(`INSERT INTO generation_manifest (id,world_seed,generator_version,ruleset_version,reference_year,generated_at) VALUES (1,?,?,?,?,?)`)
    .run(42, "probe", "probe", 2026, "2026-09-01");
  db.prepare(`INSERT INTO season (season_number,current_matchday,phase) VALUES (1,0,'pre_season')`).run();

  const insClub = db.prepare(`INSERT INTO clubs (id,name,stature_tier,is_user_club,generation_seed) VALUES (?,?,?,?,?)`);
  const attrCols = ["passing","shooting","tackling","dribbling","heading","crossing","finishing","first_touch",
    "positioning","decisions","composure","determination","teamwork","flair","bravery","aggression",
    "pace","acceleration","stamina","strength","agility","natural_fitness","injury_proneness"];
  const insPlayer = db.prepare(
    `INSERT INTO players (id,club_id,first_name,last_name,date_of_birth,potential_ability,${attrCols.join(",")},
      gk_handling,gk_reflexes,gk_aerial_reach,gk_command_of_area,gk_kicking,squad_slot,generation_seed)
     VALUES (${Array.from({ length: 6 + attrCols.length + 7 }, () => "?").join(",")})`);
  const insPos = db.prepare(`INSERT INTO player_positions (player_id,position,familiarity) VALUES (?,?,?)`);
  const insFit = db.prepare(`INSERT INTO player_fitness (player_id,season_number,condition,last_injury_severity) VALUES (?,1,?, 'none')`);
  const insContract = db.prepare(`INSERT INTO contracts (player_id,wage,years_remaining,signed_season) VALUES (?,?,?,1)`);
  const insBudget = db.prepare(`INSERT INTO club_budgets (club_id,season_number,transfer_budget_remaining,wage_budget) VALUES (?,1,?,?)`);
  const insFixture = db.prepare(`INSERT INTO fixtures (id,season_number,matchday,home_club_id,away_club_id,home_goals,away_goals,played) VALUES (?,1,?,?,?,?,?,1)`);
  const insEvent = db.prepare(`INSERT INTO events (stream_type,stream_id,seq,tag,payload) VALUES (?,?,?,?,?)`);

  const clubIds: string[] = [];
  for (let c = 0; c < clubCount; c++) {
    const clubId = makeId();
    clubIds.push(clubId);
    insClub.run(clubId, `Club ${c}`, ["big","mid","small"][c % 3]!, 0, c);
    insBudget.run(clubId, 1_000_000, 500_000);

    for (let s = 0; s < SQUAD_SIZE; s++) {
      const pid = makeId();
      const isGk = s < 3;
      const vals: (string | number | null)[] = [
        pid, clubId, FIRST[s % 10]!, LAST[(s + c) % 10]!, `199${s % 10}-0${1 + (s % 9)}-1${s % 10}`, 40 + Math.floor(rnd() * 60),
        ...attrCols.map(attr),
        ...(isGk ? [attr(), attr(), attr(), attr(), attr()] : [null, null, null, null, null]),
        s, c * 100 + s,
      ];
      insPlayer.run(...vals as never[]);
      // Real players carry ~2-3 position rows (one natural + secondaries).
      const primary = isGk ? "GK" : POSITIONS[1 + (s % 9)]!;
      insPos.run(pid, primary, "natural");
      if (!isGk) {
        insPos.run(pid, POSITIONS[1 + ((s + 3) % 9)]!, FAMILIARITIES[1]!);
        if (s % 2 === 0) insPos.run(pid, POSITIONS[1 + ((s + 5) % 9)]!, FAMILIARITIES[2]!);
      }
      insFit.run(pid, 80 + Math.floor(rnd() * 20));
      insContract.run(pid, 1000 + Math.floor(rnd() * 50000), 1 + Math.floor(rnd() * 5));
    }
  }

  // Fixtures: a played double round-robin per 20-club league, i.e. a full season already simulated.
  let fixtureCount = 0;
  const leagues = Math.floor(clubCount / CLUBS_PER_LEAGUE);
  for (let l = 0; l < leagues; l++) {
    const members = clubIds.slice(l * CLUBS_PER_LEAGUE, (l + 1) * CLUBS_PER_LEAGUE);
    let md = 1;
    for (let i = 0; i < members.length; i++) {
      for (let j = 0; j < members.length; j++) {
        if (i === j) continue;
        insFixture.run(makeId(), (md++ % 38) + 1, members[i]!, members[j]!, Math.floor(rnd() * 5), Math.floor(rnd() * 5));
        fixtureCount++;
      }
    }
  }

  // Events: ADR-0007 says every match is event-sourced. ~40 events per played fixture.
  let eventCount = 0;
  for (let f = 0; f < fixtureCount; f++) {
    const streamId = `match-${f}`;
    for (let e = 0; e < 40; e++) {
      insEvent.run("match", streamId, e, "GoalScored", `{"minute":${e},"playerId":"${makeId()}","x":0.5}`);
      eventCount++;
    }
  }
  db.exec("COMMIT");

  const genMs = (Number(process.hrtime.bigint()) - t0) / 1e6;
  return { db, clubIds, clubCount, fixtureCount, eventCount, genMs };
};

/** Faithful re-implementation of the JS post-processing in transfers.ts loadAllPlayersEcon. */
const econPostProcess = (playerRows: readonly Row[], positionRows: readonly Row[]) =>
  playerRows.map((row) => ({
    id: row.id,
    positions: positionRows.filter((p) => p.playerId === row.id).map((p) => p.position),
  }));

const run = (scenario: Scenario) => {
  const file = path.join(HERE, `PROTOTYPE-wipe-me-${scenario.label}.sqlite`);
  const { db, clubIds, clubCount, fixtureCount, eventCount, genMs } = generate(file, scenario.players, scenario.withIndexes);

  const realPlayers = asRow(db.prepare("SELECT count(*) n FROM players").get()).n as number;
  const posRows = asRow(db.prepare("SELECT count(*) n FROM player_positions").get()).n as number;

  db.close();
  const bytes = statSync(file).size;

  // Reopen cold so the page cache is not carrying the generation working set.
  const rdb = new DatabaseSync(file);

  const attrSel = ["passing","shooting","tackling","dribbling","heading","crossing","finishing","first_touch",
    "positioning","decisions","composure","determination","teamwork","flair","bravery","aggression",
    "pace","acceleration","stamina","strength","agility","natural_fitness","injury_proneness"]
    .map((c) => `p.${c}`).join(",");

  // 1. Squad view — the real query from squad.ts.
  const squadSql = `SELECT p.id, p.first_name, p.last_name, p.date_of_birth, ${attrSel},
      COALESCE(pf.condition, 100) as condition, tf.focus
    FROM players p
    LEFT JOIN player_fitness pf ON pf.player_id = p.id AND pf.season_number = (SELECT MAX(season_number) FROM season)
    LEFT JOIN training_focus tf ON tf.player_id = p.id
    WHERE p.club_id = ?`;
  const squadStmt = rdb.prepare(squadSql);
  const targetClub = clubIds[Math.floor(clubIds.length / 2)]!;
  const [, squadMs] = time("squad", () => squadStmt.all(targetClub));

  // 2. League table — the real query from season.ts computeStandings: ALL clubs, ALL played fixtures.
  const [, tableMs] = time("table", () => {
    const clubs = asRows(rdb.prepare("SELECT id, name FROM clubs").all());
    const fixtures = rdb.prepare(
      "SELECT home_club_id as homeClubId, away_club_id as awayClubId, home_goals as homeGoals, away_goals as awayGoals FROM fixtures WHERE season_number = 1 AND played = 1",
    ).all();
    const tallies = new Map(clubs.map((c) => [c.id, { p: 0, gf: 0, ga: 0 }]));
    for (const f of asRows(fixtures)) {
      const h = tallies.get(f.homeClubId); const a = tallies.get(f.awayClubId);
      if (!h || !a) continue;
      h.p++; a.p++;
      h.gf += Number(f.homeGoals); h.ga += Number(f.awayGoals);
      a.gf += Number(f.awayGoals); a.ga += Number(f.homeGoals);
    }
    return tallies.size;
  });

  // 3. Player search across the whole world — the real loadAllPlayersEcon, SQL then JS.
  const econSqlStmt = rdb.prepare(
    `SELECT p.id, p.club_id as clubId, c.name as clubName, p.first_name, p.last_name, p.date_of_birth,
            p.potential_ability, ${attrSel}
     FROM players p LEFT JOIN clubs c ON c.id = p.club_id`);
  const posStmt = rdb.prepare("SELECT player_id as playerId, position, familiarity FROM player_positions");
  const [econRows, econSqlMs] = time("econ-sql", () => [econSqlStmt.all(), posStmt.all()] as const);

  // The JS post-process is O(players x positions). Cap it so the probe itself terminates; extrapolate.
  const CAP = 300;
  const capped = asRows(econRows[0]).slice(0, CAP);
  const [, cappedJsMs] = time("econ-js", () => econPostProcess(capped, asRows(econRows[1])));
  const jsScale = asRows(econRows[0]).length / capped.length;
  const econJsProjectedMs = cappedJsMs * jsScale;

  // Per-table byte breakdown, if dbstat is compiled in.
  let breakdown = "dbstat unavailable";
  try {
    const rows = asRows(rdb.prepare(
      "SELECT name, sum(pgsize) bytes FROM dbstat GROUP BY name ORDER BY bytes DESC LIMIT 8",
    ).all());
    breakdown = rows.map((r) => `${r.name}=${(Number(r.bytes) / 1e6).toFixed(1)}MB`).join(" ");
  } catch { /* not compiled in */ }

  rdb.close();

  return {
    label: scenario.label, withIndexes: scenario.withIndexes,
    players: realPlayers, clubs: clubCount, posRows, fixtures: fixtureCount, events: eventCount,
    mb: bytes / 1e6, genMs, squadMs, tableMs, econSqlMs, econJsProjectedMs, breakdown,
  };
};

const scenarios: Scenario[] = [
  { label: "20k", players: 20_000, withIndexes: false },
  { label: "100k", players: 100_000, withIndexes: false },
  { label: "400k", players: 400_000, withIndexes: false },
  { label: "400k-indexed", players: 400_000, withIndexes: true },
];

const results = scenarios.map((s) => {
  const r = run(s);
  console.log(
    `\n== ${r.label}${r.withIndexes ? " (with indexes)" : ""} ==\n` +
    `  rows      players=${r.players} clubs=${r.clubs} positions=${r.posRows} fixtures=${r.fixtures} events=${r.events}\n` +
    `  file      ${r.mb.toFixed(1)} MB\n` +
    `  generate  ${(r.genMs / 1000).toFixed(1)} s\n` +
    `  squad     ${r.squadMs.toFixed(1)} ms   (squad.ts loadSquadPlayers, one club)\n` +
    `  table     ${r.tableMs.toFixed(1)} ms   (season.ts computeStandings)\n` +
    `  search    ${r.econSqlMs.toFixed(1)} ms SQL + ~${(r.econJsProjectedMs / 1000).toFixed(1)} s JS  (transfers.ts loadAllPlayersEcon)\n` +
    `  bytes     ${r.breakdown}`,
  );
  return r;
});

console.log("\n\n### Summary table\n");
console.log("| scenario | players | file MB | gen s | squad ms | table ms | search SQL ms | search JS s |");
console.log("|---|---|---|---|---|---|---|---|");
for (const r of results) {
  console.log(`| ${r.label} | ${r.players} | ${r.mb.toFixed(0)} | ${(r.genMs / 1000).toFixed(1)} | ${r.squadMs.toFixed(1)} | ${r.tableMs.toFixed(0)} | ${r.econSqlMs.toFixed(0)} | ${(r.econJsProjectedMs / 1000).toFixed(1)} |`);
}
