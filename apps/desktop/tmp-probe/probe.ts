import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Effect } from "effect";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { beginCareer, commitCareer } from "../src/main/world/index.js";
import { MatchSeedSource, resumeSimulation, startMatch, deriveFixtureMatchSeed } from "../src/main/match/index.js";
import { advanceCalendar } from "../src/main/season/index.js";
import { ensureHumanTactic, pendingFixtureId } from "../test/main/boundary-helpers.js";
import { createDefaultSnapshot } from "../test/main/snapshot-helpers.js";

const WORLD_SEED = 20260906;
const seedArg = process.argv[2];

const program = Effect.gen(function* () {
  const savesDir = mkdtempSync(path.join(os.tmpdir(), "probe-"));
  const snapshotId = yield* createDefaultSnapshot(savesDir);
  const { id } = yield* beginCareer(savesDir, { worldSeed: WORLD_SEED, referenceYear: 2026, userDataDir: savesDir, snapshotId });
  const clubs = yield* Effect.gen(function* () {
    const sql = yield* SqlClient;
    const byRow = yield* sql<{ id: string; name: string; stature: string }>`SELECT id, stature_tier as stature FROM clubs ORDER BY rowid LIMIT 3`;
    const big = yield* sql<{ id: string; name: string; stature: string }>`SELECT id, stature_tier as stature FROM clubs ORDER BY CASE stature_tier WHEN 'big' THEN 0 ELSE 1 END, id LIMIT 1`;
    return { byRow, big };
  }).pipe(Effect.provide(SqliteClient.layer({ filename: path.join(savesDir, `${id}.sqlite`) })), Effect.scoped);
  console.log(JSON.stringify(clubs));
  const save = yield* commitCareer(savesDir, id, "Probe", clubs.byRow[0]!.id as Parameters<typeof commitCareer>[3], { managerName: "Probe", archetypeOrigin: "custom", pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 } });
  yield* ensureHumanTactic(savesDir, save.id);
  yield* advanceCalendar(savesDir, save.id);
  const fixtureId = yield* pendingFixtureId(savesDir, save.id);
  console.log("fixture", fixtureId, "derived", deriveFixtureMatchSeed(WORLD_SEED, fixtureId!));
  let start = startMatch(savesDir, save.id, fixtureId!, "play");
  if (seedArg !== undefined) start = start.pipe(Effect.provideService(MatchSeedSource, () => Number(seedArg)));
  const summary = yield* start;
  console.log(JSON.stringify(summary));
  let cursor = 0; let done = false; let lines = 0;
  while (!done) {
    const chunk = yield* resumeSimulation(savesDir, save.id, summary.matchId, cursor);
    for (const line of chunk.lines) { lines++; if (line.tag === "Injury" || line.tag === "RedCard") console.log(lines, JSON.stringify(line)); }
    if (chunk.injuries.length) console.log("injuries", JSON.stringify(chunk.injuries), "clubs", chunk.injuredClubIds);
    cursor = chunk.cursor; done = chunk.isComplete;
  }
  console.log("total lines", lines);
});
Effect.runPromise(program).catch((e) => { console.error(e); process.exit(1); });
