import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { type Locator, type Page } from "@playwright/test";
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
 * The first rival Club `seedScouted` progressed — its display name, the size of its squad, and its
 * two Players at progress 40 and 100 (in `ORDER BY id` order, the same order the seed wrote them
 * in). Club names are not a column on `clubs`: they live in the save's content pack, so the spec
 * resolves them through the same `displayNames` seam every read uses (Agent Note 2026-09-19).
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
      const squad = yield* sql<{ count: number }>`
        SELECT COUNT(*) as "count" FROM players WHERE club_id = ${clubId}`;
      const players = yield* sql<{ firstName: string; lastName: string; progress: number }>`
        SELECT p.first_name as "firstName", p.last_name as "lastName", sp.progress
        FROM players p JOIN scouting_progress sp ON sp.player_id = p.id
        WHERE p.club_id = ${clubId} ORDER BY p.id`;
      if (players.length < 2 || players[0]!.progress !== 40 || players[1]!.progress !== 100) {
        throw new Error("expected the seeded rival to carry two players at progress 40 and 100");
      }
      return {
        clubName: nameOf(clubId),
        squadSize: squad[0]!.count,
        players,
      };
    }),
  );

/** The manager's own club — its display name and squad size. Squad rows read exact by rule,
 *  always. (An own *player* is not searched by their name here: the name pools are finite, so a
 *  rival can share a full name, and a name-scoped row would be ambiguous. Club names are unique.) */
const ownClubOf = (savePath: string) =>
  withSave(
    savePath,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const nameOf = yield* displayNames;
      const club = yield* sql<{ id: string }>`
        SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      const clubId = club[0]?.id;
      if (clubId === undefined) throw new Error("expected the own club in the seeded save");
      const squad = yield* sql<{ count: number }>`
        SELECT COUNT(*) as "count" FROM players WHERE club_id = ${clubId}`;
      return { clubName: nameOf(clubId), squadSize: squad[0]!.count };
    }),
  );

/** The search form's own slot — `goto` leaves a previous query's results committed on screen. */
const searchByName = async (page: Page, name: string): Promise<void> => {
  await page.getByRole("textbox", { name: "Player name" }).fill(name);
  await page.getByRole("button", { name: "Search", exact: true }).click();
};

/**
 * The search result row for one played name: the full-squad row returned by a club-name search.
 * The identity cell is the name button (DataTable), the figure cells that follow are `td`s.
 */
const rowOf = (results: Locator, name: string): Locator =>
  results.getByRole("row").filter({ hasText: name });

/**
 * Player Search (Screen 119, ticket 11) reads every search hit by the human club's Scouting
 * Progress under the shared knowledge rule: the own squad and a Fully Scouted rival read exact
 * figures, every other competitor reads `low–high` bands. The wire promises the same rule across
 * the whole search — that is `test/main/transfers/player-search.test.ts`'s no-exact walk; this
 * spec drives the real screen — nav into the fully-wired route, a committed form query, and the
 * handoff to the Player Profile the results open.
 */
test("Player Search reads a scouted rival exact at 100 and ranged at 40, and opens the Profile", async ({
  window: page,
  userDataDir,
}) => {
  const dir = savesDir(userDataDir);
  const saveId = await seedScouted(dir);
  const target = await scoutedRivalOf(path.join(dir, `${saveId}.sqlite`));
  const [at40, at100] = [target.players[0]!, target.players[1]!];
  const name40 = `${at40.firstName} ${at40.lastName}`;
  const name100 = `${at100.firstName} ${at100.lastName}`;
  const own = await ownClubOf(path.join(dir, `${saveId}.sqlite`));

  await continueSeededCareer(page, "Seed: scouted");
  await goto(page, "player search");
  await expect(page.getByRole("heading", { name: "Player Search", level: 1 })).toBeVisible();
  await expect(page.getByRole("main", { name: "Player Search" })).toBeVisible();

  // Criterion 5: the placeholder is gone — the results read is committed to the form, nothing is
  // mounted before a search, and the first submission lands real rows (and the placeholder text
  // itself has been replaced by the results read, not left to render alongside it).
  await expect(page.getByText(/Set the filters above and search/)).toBeVisible();
  await expect(page.getByRole("group", { name: "Search results" })).toHaveCount(0);

  // Search the seeded rival's whole squad by club name: 40% reads bands, 100% reads exact.
  await page.getByRole("textbox", { name: "Club name" }).fill(target.clubName);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const results = page.getByRole("group", { name: "Search results" });
  await expect(results).toBeVisible();
  // Header row included: the squad's rows, plus the table header.
  await expect(results.getByRole("row")).toHaveCount(target.squadSize + 1);
  await expect(rowOf(results, name100).getByText(/^\d+–\d+$/)).toHaveCount(0);
  await expect(rowOf(results, name100).getByText(/Cr–/)).toHaveCount(0);
  await expect(rowOf(results, name100).getByText(/^\d(\d|[., ])* Cr$/).first()).toBeVisible();
  await expect(rowOf(results, name40).getByText(/^\d+–\d+$/).first()).toBeVisible();
  await expect(
    rowOf(results, name40).getByText(/^\d(\d|[., ])* Cr–\d(\d|[., ])* Cr$/),
  ).toBeVisible();

  // A result's name opens its Player Profile — the same knowledge-limited read, exact at 100.
  await rowOf(results, name100).getByRole("button", { name: name100 }).click();
  const profile = page.getByRole("main", { name: name100 });
  await expect(profile.getByRole("region", { name: "Physical" })).toBeVisible();
  const physical = profile.getByRole("region", { name: "Physical" });
  await expect(physical.getByText(/^\d(\d|[., ])* Cr$/)).toBeVisible();
  await expect(physical.getByText(/^\d+–\d+$/)).toHaveCount(0);
  await expect(physical.getByText(/Cr–/)).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);

  // Back to the search screen: navigating away unmounts the form, so both searches are fresh.
  await goto(page, "player search");
  await expect(page.getByText(/Set the filters above and search/)).toBeVisible();

  // The name filter works, and a name nobody in the save has reads as an empty result — no name
  // collision can ambush this (the pools are finite; a generated world can hold two players with
  // the same full name, which is why the player assertions above run club-scoped searches).
  await searchByName(page, "Nonesuch");
  await expect(page.getByText(/^0 players match\.$/)).toBeVisible();

  // The manager's own squad is searchable and reads exact — the squad rule from the wire.
  await page.getByRole("textbox", { name: "Player name" }).fill("");
  await page.getByRole("textbox", { name: "Club name" }).fill(own.clubName);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(results.getByRole("row")).toHaveCount(own.squadSize + 1);
  await expect(results.getByText(/^\d+–\d+$/)).toHaveCount(0);
  await expect(results.getByText(/Cr–/)).toHaveCount(0);
  await expect(results.getByText(/^\d(\d|[., ])* Cr$/).first()).toBeVisible();
});