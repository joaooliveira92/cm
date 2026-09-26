import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { continueSeededCareer, expect, goto, pressPrefix, test } from "./launchApp.js";
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
 * progress 40 and 100. Club names are not a column on `clubs`: they live in the save's content
 * pack, so the spec resolves them through the same `displayNames` seam every read uses.
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
 * The any-club squad (Screen 35, group-c ticket 10). The league table row names a club, so it is
 * the entry point into that club's squad page — the shared `SquadRoster` rendered bare: no
 * lineup selector, no column controls, no sort; its Players read by Scouting Progress, so the
 * seed's 40%-player shows `low–high` bands while the Fully Scouted player shows plain numbers.
 */
test("a league row opens that club's squad, marked and read-only, ranged by scouting", async ({
  window: page,
  userDataDir,
}) => {
  const dir = savesDir(userDataDir);
  const saveId = await seedScouted(dir);
  const target = await scoutedRivalOf(path.join(dir, `${saveId}.sqlite`));

  await continueSeededCareer(page, "Seed: scouted");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  const squad = page.getByRole("button", { name: `${target.clubName} — club squad` });
  await expect(squad).toBeVisible();
  await squad.click();

  // The club header names the club and, because it is not the manager's, carries the marker.
  await expect(page.getByRole("heading", { name: new RegExp(`^${target.clubName}`) })).toBeVisible();
  await expect(page.getByText("[Not your club]")).toBeVisible();

  // Read-only: every affordance of the own-club lineup manager is absent — the match-day
  // lineup bar (labelled "Lineup selector"), the column controls, the toolbar's filters.
  await expect(page.getByLabel("Lineup selector")).toHaveCount(0);
  await expect(page.getByText("Show / hide columns")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore defaults" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Filter squad by position" })).toHaveCount(0);

  const table = page.getByRole("main").getByRole("group", { name: "Squad" });
  await expect(table).toBeVisible();

  // The knowledge rule, end to end: the 40%-progress player reads as Attribute Ranges (the en
  // dash band appears on his row), the Fully Scouted player as plain exact numbers.
  const rangedName = `${target.players[0]!.firstName} ${target.players[0]!.lastName}`;
  const exactName = `${target.players[1]!.firstName} ${target.players[1]!.lastName}`;
  await expect(table.getByRole("button", { name: rangedName })).toBeVisible();
  await expect(table.getByRole("button", { name: exactName })).toBeVisible();

  const rangedRow = table.getByRole("row").filter({ hasText: rangedName });
  await expect(rangedRow.getByText(/\d+–\d+/).first()).toBeVisible();
  const exactRow = table.getByRole("row").filter({ hasText: exactName });
  await expect(exactRow.getByText(/\d+–\d+/)).toHaveCount(0);
  await expect(exactRow.getByText(/^\d+$/).first()).toBeVisible();

  // g b returns through real history to the page the entry point came from.
  await pressPrefix(page, "b");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();
});

test("the manager's own club row opens its squad exact and unmarked", async ({
  window: page,
  userDataDir,
}) => {
  await seedScouted(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: scouted");

  await goto(page, "league table");
  await expect(page.getByRole("heading", { name: "League Table" })).toBeVisible();

  const ownName =
    (await page.getByRole("banner").locator("span.truncate.text-lg.font-bold").textContent())?.trim() ?? "";
  expect(ownName.length).toBeGreaterThan(0);

  const ownRow = page
    .getByRole("main")
    .getByRole("table")
    .getByRole("button", { name: `${ownName} — club squad`, exact: true });
  await expect(ownRow).toBeVisible();
  await ownRow.click();

  await expect(page.getByRole("heading", { name: new RegExp(`^${ownName}`) })).toBeVisible();
  await expect(page.getByText("[Not your club]")).toHaveCount(0);

  // The manager's own squad reads exact: every OVR and Attribute cell is a plain number, and the
  // en-dash band never appears anywhere on the page.
  await expect(page.getByText(/\d+–\d+/)).toHaveCount(0);
});