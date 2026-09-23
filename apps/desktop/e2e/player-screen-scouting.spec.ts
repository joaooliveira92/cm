import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { type Locator } from "@playwright/test";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedScouted } from "./seedSaves.js";
import { displayNames } from "../src/main/world/displayNames.js";

const withSave = <A, E>(filename: string, effect: Effect.Effect<A, E, SqlClient>): Promise<A> =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename })),
    Effect.scoped,
    Effect.runPromise,
  );

/**
 * The first rival Club `seedScouted` progressed — its display name, and the two Players it put at
 * progress 40 and 100 (in `ORDER BY id` order, the same order the seed wrote them in). Club names
 * are not a column on `clubs`: they live in the save's content pack, so the spec resolves them
 * through the same `displayNames` seam every read uses (Agent Note 2026-09-19).
 */
const scoutedRivalOf = (savePath: string) =>
  withSave(
    savePath,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const nameOf = yield* displayNames;
      const rival = yield* sql<{ id: string }>`
        SELECT DISTINCT c.id FROM clubs c JOIN players p ON p.club_id = c.id
        WHERE c.is_user_club = 0 ORDER BY c.id LIMIT 1`;
      const clubId = rival[0]?.id;
      if (clubId === undefined) throw new Error("expected a scouted rival club in the seeded save");
      const players = yield* sql<{ firstName: string; lastName: string; progress: number }>`
        SELECT p.first_name as "firstName", p.last_name as "lastName", sp.progress
        FROM players p JOIN scouting_progress sp ON sp.player_id = p.id
        WHERE p.club_id = ${clubId} ORDER BY p.id`;
      if (players.length < 2 || players[0]!.progress !== 40 || players[1]!.progress !== 100) {
        throw new Error("expected the seeded rival to carry two players at progress 40 and 100");
      }
      return { clubName: nameOf(clubId), players };
    }),
  );

/**
 * The Player screens read a rival by Scouting Progress (ticket 10): `seedScouted` puts two Players
 * of one rival Club at progress 40 and 100, so both become key players on its Team Scout Report.
 * This spec drives the real navigation — League Table row → scout report → key player — and asserts
 * the Player screen through it: the Fully Scouted player reads exact figures (plain-number Overall
 * Rating, single-Cr Value), the 40% player reads the same rows as `low–high` bands. Both screens'
 * exact-only-below-Fully-Scouted rule is the renderer's promise here; the wire's is asserted in
 * `test/main/career/player-profile.test.ts` (the no-exact walk), and the Contract Overview renders
 * the same bands (`player-contract-screen.test.tsx`).
 */
test("a rival Player's Profile shows exact figures only at Fully Scouted; mid-progress reads as ranges", async ({
  window: page,
  userDataDir,
}) => {
  const dir = savesDir(userDataDir);
  const saveId = await seedScouted(dir);
  const target = await scoutedRivalOf(path.join(dir, `${saveId}.sqlite`));

  await continueSeededCareer(page, "Seed: scouted");

  /** League Table → the target's scout report, one click each, and the report's Squad key players. */
  const openReport = async () => {
    await goto(page, "league table");
    await expect(page.getByRole("heading", { name: "League Table", level: 1 })).toBeVisible();
    const report = page.getByRole("button", { name: `${target.clubName} — scout report` });
    await expect(report).toBeVisible();
    await report.click();
    await expect(page.getByRole("heading", { name: target.clubName, level: 1 })).toBeVisible();
    // The "Key players" section is named by its heading (`aria-labelledby`), so it is a region.
    return page.getByRole("region", { name: "Key players" });
  };

  /** The key-player row at `progress`, and that player's Profile screen (Profile tab is the default). */
  const openPlayerAt = async (keyPlayers: Locator, progress: number): Promise<Locator> => {
    const row = keyPlayers.getByRole("listitem").filter({ hasText: `Scouted ${progress}%` });
    await expect(row).toBeVisible();
    const name = (await row.getByRole("button").innerText()).trim();
    await row.getByRole("button").click();
    const main = page.getByRole("main", { name });
    await expect(main.getByRole("region", { name: "Physical" })).toBeVisible();
    return main;
  };

  // 1) Seed's Fully Scouted Player (progress 100): the Profile's derived pair and every Attribute
  //    read as exact — the en-dash band never appears, and the Value is one Credits figure.
  let keyPlayers = await openReport();
  let main = await openPlayerAt(keyPlayers, 100);
  let physical = main.getByRole("region", { name: "Physical" });
  await expect(physical.getByText(/^\d(\d|[., ])* Cr$/)).toBeVisible();
  await expect(physical.getByText(/^\d+–\d+$/)).toHaveCount(0);
  await expect(physical.getByText(/Cr–/)).toHaveCount(0);

  // 2) Seed's 40%-progress Player: the same rows read as `low–high` bands — Overall Rating band on
  //    the 1-20/1-100 scale, and a Value band with Cr on both ends (locale-independent regex).
  keyPlayers = await openReport();
  main = await openPlayerAt(keyPlayers, 40);
  physical = main.getByRole("region", { name: "Physical" });
  await expect(physical.getByText(/^\d+–\d+$/).first()).toBeVisible();
  await expect(physical.getByText(/^\d(\d|[., ])* Cr–\d(\d|[., ])* Cr$/)).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});