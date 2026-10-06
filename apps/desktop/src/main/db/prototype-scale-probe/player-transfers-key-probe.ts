/**
 * PROTOTYPE — THROWAWAY. Measures the one thing open question 22 asks for and nothing else:
 * what `player_transfers`' key costs, and whether the career-history read needs an index.
 *
 * Deliberately not an extension of `probe.ts`. That harness generates a whole world against a DDL
 * that has since moved on — `clubs.name`, `season.current_matchday` and `fixtures.matchday` are all
 * gone — and reviving it would be a day's work measuring things nobody asked about. The question
 * here is about one table's key and one read, so this builds that table at twenty seasons of rows
 * and measures the read three ways.
 *
 * Run: pnpm tsx apps/desktop/src/main/db/prototype-scale-probe/player-transfers-key-probe.ts
 * Writes ./PROTOTYPE-wipe-me-transfers-*.sqlite next to itself.
 */
import { DatabaseSync } from "node:sqlite";
import { existsSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The spec's figures: ~32,000 transfers a season, twenty seasons. */
const TRANSFERS_PER_SEASON = 32_000;
const SEASONS = 20;
const TOTAL = TRANSFERS_PER_SEASON * SEASONS;

/** A world big enough that a player-keyed read is a needle in a haystack. */
const PLAYERS = 400_000;
const CLUBS = 16_000;

let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const hex = (n: number, w: number) => (n >>> 0).toString(16).padStart(w, "0").slice(-w);
/** The real id shape: a 36-char UUID-format string, as `deriveId` produces. */
const id = (n: number) =>
  `${hex(n, 8)}-${hex(n * 7, 4)}-4${hex(n * 13, 3)}-8${hex(n * 17, 3)}-${hex(n * 19, 12)}`;

const time = <A>(f: () => A): [A, number] => {
  const t0 = Number(process.hrtime.bigint());
  const a = f();
  return [a, (Number(process.hrtime.bigint()) - t0) / 1e6];
};

interface Candidate {
  readonly label: string;
  readonly ddl: string;
  readonly index: string | null;
  readonly insert: string;
  /** Surrogate keys need a value; composite ones do not. */
  readonly surrogate: boolean;
  /** Which order the composite's insert takes its bound values in. */
  readonly columnOrder?: "date-club";
}

const CANDIDATES: ReadonlyArray<Candidate> = [
  {
    label: "surrogate-unindexed",
    ddl: `CREATE TABLE player_transfers (
      id INTEGER PRIMARY KEY,
      player_id TEXT NOT NULL,
      from_club_id TEXT,
      to_club_id TEXT NOT NULL,
      transferred_on TEXT NOT NULL,
      fee INTEGER NOT NULL
    )`,
    index: null,
    insert: `INSERT INTO player_transfers (id,player_id,from_club_id,to_club_id,transferred_on,fee) VALUES (?,?,?,?,?,?)`,
    surrogate: true,
  },
  {
    label: "surrogate-plus-index",
    ddl: `CREATE TABLE player_transfers (
      id INTEGER PRIMARY KEY,
      player_id TEXT NOT NULL,
      from_club_id TEXT,
      to_club_id TEXT NOT NULL,
      transferred_on TEXT NOT NULL,
      fee INTEGER NOT NULL
    )`,
    index: `CREATE INDEX player_transfers_player_date_idx ON player_transfers(player_id, transferred_on)`,
    insert: `INSERT INTO player_transfers (id,player_id,from_club_id,to_club_id,transferred_on,fee) VALUES (?,?,?,?,?,?)`,
    surrogate: true,
  },
  {
    label: "composite-player-date",
    // The composite's automatic index *is* the career-history access path, so no second index.
    ddl: `CREATE TABLE player_transfers (
      player_id TEXT NOT NULL,
      transferred_on TEXT NOT NULL,
      from_club_id TEXT,
      to_club_id TEXT NOT NULL,
      fee INTEGER NOT NULL,
      PRIMARY KEY (player_id, transferred_on)
    )`,
    index: null,
    insert: `INSERT OR IGNORE INTO player_transfers (player_id,transferred_on,from_club_id,to_club_id,fee) VALUES (?,?,?,?,?)`,
    surrogate: false,
  },
  {
    label: "composite-player-date-club",
    // Adding the destination breaks the same-day tie the pair above cannot.
    ddl: `CREATE TABLE player_transfers (
      player_id TEXT NOT NULL,
      transferred_on TEXT NOT NULL,
      to_club_id TEXT NOT NULL,
      from_club_id TEXT,
      fee INTEGER NOT NULL,
      PRIMARY KEY (player_id, transferred_on, to_club_id)
    )`,
    index: null,
    insert: `INSERT OR IGNORE INTO player_transfers (player_id,transferred_on,to_club_id,from_club_id,fee) VALUES (?,?,?,?,?)`,
    surrogate: false,
    columnOrder: "date-club",
  },
  {
    label: "composite-player-date-club-without-rowid",
    // The same key, with the row stored *in* the primary-key B-tree rather than beside it.
    ddl: `CREATE TABLE player_transfers (
      player_id TEXT NOT NULL,
      transferred_on TEXT NOT NULL,
      to_club_id TEXT NOT NULL,
      from_club_id TEXT,
      fee INTEGER NOT NULL,
      PRIMARY KEY (player_id, transferred_on, to_club_id)
    ) WITHOUT ROWID`,
    index: null,
    insert: `INSERT OR IGNORE INTO player_transfers (player_id,transferred_on,to_club_id,from_club_id,fee) VALUES (?,?,?,?,?)`,
    surrogate: false,
    columnOrder: "date-club",
  },
];

/** A transfer's date: within one season's windows, so a player can move twice in a season. */
const dateFor = (season: number, slot: number): string => {
  const year = 2026 + season;
  const july = slot % 2 === 0;
  const day = 1 + (slot % 28);
  return july ? `${year}-07-${String(day).padStart(2, "0")}` : `${year + 1}-01-${String(day).padStart(2, "0")}`;
};

const build = (candidate: Candidate) => {
  const file = path.join(HERE, `PROTOTYPE-wipe-me-transfers-${candidate.label}.sqlite`);
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    if (existsSync(file + suffix)) unlinkSync(file + suffix);
  }

  const db = new DatabaseSync(file);
  db.exec(candidate.ddl);
  if (candidate.index !== null) db.exec(candidate.index);

  const insert = db.prepare(candidate.insert);
  db.exec("BEGIN");
  let row = 0;
  for (let season = 0; season < SEASONS; season += 1) {
    for (let n = 0; n < TRANSFERS_PER_SEASON; n += 1) {
      row += 1;
      const playerId = id(Math.floor(rnd() * PLAYERS));
      const fromClub = rnd() < 0.1 ? null : id(1_000_000 + Math.floor(rnd() * CLUBS));
      const toClub = id(1_000_000 + Math.floor(rnd() * CLUBS));
      const on = dateFor(season, n);
      const fee = Math.floor(rnd() * 50_000_000);
      if (candidate.surrogate) insert.run(row, playerId, fromClub, toClub, on, fee);
      else if (candidate.columnOrder === "date-club") insert.run(playerId, on, toClub, fromClub, fee);
      else insert.run(playerId, on, fromClub, toClub, fee);
    }
  }
  db.exec("COMMIT");
  const inserted = (db.prepare("SELECT count(*) n FROM player_transfers").get() as { n: number }).n;
  db.close();

  return { file, bytes: statSync(file).size, inserted };
};

const measure = (candidate: Candidate) => {
  const { file, bytes, inserted } = build(candidate);

  // Reopen cold, so the page cache is not carrying the write working set.
  const db = new DatabaseSync(file);
  const query = `SELECT from_club_id, to_club_id, transferred_on, fee
    FROM player_transfers WHERE player_id = ? ORDER BY transferred_on ASC`;
  const statement = db.prepare(query);

  const plan = (db.prepare(`EXPLAIN QUERY PLAN ${query}`).all(id(1)) as Array<{ detail: string }>)
    .map((r) => r.detail)
    .join(" | ");

  // A career history is read one player at a time. Average over players that actually moved.
  const sampled = (db.prepare(`SELECT player_id FROM player_transfers LIMIT 25`).all() as Array<{ player_id: string }>)
    .map((r) => r.player_id);
  const [, totalMs] = time(() => {
    for (const playerId of sampled) statement.all(playerId);
  });

  db.close();
  return {
    label: candidate.label,
    rows: inserted,
    megabytes: bytes / 1024 / 1024,
    readMs: totalMs / sampled.length,
    plan,
  };
};

console.log(`player_transfers key probe — ${SEASONS} seasons x ${TRANSFERS_PER_SEASON} = ${TOTAL} transfers\n`);
const results = CANDIDATES.map(measure);

for (const result of results) {
  console.log(`${result.label}`);
  console.log(`  rows          ${result.rows.toLocaleString()}`);
  console.log(`  file          ${result.megabytes.toFixed(1)} MB`);
  console.log(`  career read   ${result.readMs.toFixed(3)} ms`);
  console.log(`  plan          ${result.plan}\n`);
}
