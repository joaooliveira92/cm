import path from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import {
  assignFullTactic,
  continueSeededCareer,
  expect,
  goto,
  matchScore,
  openTacticsEditor,
  test,
} from "./launchApp.js";
import { savesDir, seedBeforeMatchday } from "./seedSaves.js";

/**
 * The CM 03/04 match screen (map tickets 12, 16, 19, 20): the two E2E passes the spec's Testing
 * Decisions call for. One drives a live match to Home Stats, Away Stats and Latest Scores, then
 * accepts the result and reads the day's scores; the other plays a Matchday and opens a starter's
 * Form tab. Both run the shipped bundle through `pnpm … test:e2e`, whose `pretest:e2e` rebuilds
 * first.
 */

const withSave = <A, E>(filename: string, effect: Effect.Effect<A, E, SqlClient>): Promise<A> =>
  effect.pipe(
    Effect.provide(SqliteClient.layer({ filename })),
    Effect.scoped,
    Effect.runPromise,
  );

/**
 * A player the user's club actually fielded in its last recorded fixture, read from the lines the
 * Matchday commit wrote. Opening his Form tab proves the whole chain: the commit wrote the line, the
 * Form read joined it to the fixture, and the screen rendered it. The name is the two columns the
 * squad table draws from, so no display-name seam is needed.
 */
const userStarterOf = (savePath: string) =>
  withSave(
    savePath,
    Effect.gen(function* () {
      const sql = yield* SqlClient;
      const user = yield* sql<{ id: string }>`SELECT id FROM clubs WHERE is_user_club = 1 LIMIT 1`;
      const clubId = user[0]?.id;
      if (clubId === undefined) throw new Error("expected a user club in the seeded save");
      const rows = yield* sql<{ firstName: string; lastName: string }>`
        SELECT p.first_name as "firstName", p.last_name as "lastName"
        FROM player_match_lines l JOIN players p ON p.id = l.player_id
        WHERE l.club_id = ${clubId} AND l.started = 1
        ORDER BY l.fixture_id DESC, l.squad_number
        LIMIT 1`;
      const player = rows[0];
      if (player === undefined) throw new Error("expected a recorded starter in the user's fixture");
      return player;
    }),
  );

/** Seed at the Matchday 1 boundary, name the eleven, and reach Match day with the match playable. */
const reachMatchDay = async (
  page: Parameters<typeof goto>[0],
  userDataDir: string,
): Promise<string> => {
  const saveId = await seedBeforeMatchday(savesDir(userDataDir));
  await continueSeededCareer(page, "Seed: before-matchday");
  await goto(page, "tactics");
  await openTacticsEditor(page);
  await assignFullTactic(page);
  await goto(page, "match day");
  return saveId;
};

test("a live match reaches Home Stats, Away Stats and Latest Scores, live and after acceptance (map tickets 12, 16)", async ({
  window: page,
  userDataDir,
}) => {
  // It plays a whole match at the live reveal pace, past the default 45 s per test.
  test.setTimeout(180_000);
  await reachMatchDay(page, userDataDir);

  const start = page.getByRole("button", { name: "Play match" });
  await expect(start).toBeEnabled({ timeout: 15_000 });
  await start.click();
  await expect(matchScore(page)).toBeVisible();

  const tabs = page.getByRole("tablist", { name: "Live Match" });
  await expect(tabs).toBeVisible();

  // Home Stats: the club names the heading, the table draws, and the fold rule is stated once.
  await tabs.getByRole("tab", { name: "Home Stats" }).click();
  const home = page.getByRole("main", { name: "Home Stats" });
  await expect(home.getByRole("heading", { name: / Stats$/ })).toBeVisible();
  await expect(home.getByRole("table")).toBeVisible();
  await expect(home.getByText("Only what the match records is shown.")).toBeVisible();

  // Away Stats: the same table for the other side, under its own heading.
  await tabs.getByRole("tab", { name: "Away Stats" }).click();
  const away = page.getByRole("main", { name: "Away Stats" });
  await expect(away.getByRole("heading", { name: / Stats$/ })).toBeVisible();
  await expect(away.getByRole("table")).toBeVisible();

  // Latest Scores live: the day's fixtures, no score, under the full-time caption.
  await tabs.getByRole("tab", { name: "Latest Scores" }).click();
  const latest = page.getByRole("main", { name: "Match Latest Scores" });
  await expect(latest.getByRole("heading", { name: "Latest Scores" })).toBeVisible();
  await expect(latest.getByText("Results come in at full time.")).toBeVisible();
  await expect(latest.getByText(/^\d+ - \d+$/)).toHaveCount(0);

  // Back to Match, fast-forward to full time, and accept the result.
  await tabs.getByRole("tab", { name: "Match" }).click();
  const matchDay = page.getByRole("main", { name: "Match day" });
  await matchDay.getByRole("group", { name: "Commentary speed" }).getByRole("button", { name: "Fast" }).click();
  const accept = matchDay.getByRole("button", { name: "Accept result" });
  await expect(accept).toBeVisible({ timeout: 90_000 });
  await accept.click();
  await expect(matchDay.getByText("Result accepted. Continue to move on.")).toBeVisible({ timeout: 15_000 });

  // Latest Scores after acceptance: the caption is gone and the day's results carry scores.
  await tabs.getByRole("tab", { name: "Latest Scores" }).click();
  await expect(latest.getByRole("heading", { name: "Latest Scores" })).toBeVisible();
  await expect(latest.getByText("Results come in at full time.")).toHaveCount(0);
  await expect(latest.getByText(/^\d+ - \d+$/).first()).toBeVisible();
});

test("a starter's Form tab opens after a played Matchday, showing the recorded line (map tickets 19, 20)", async ({
  window: page,
  userDataDir,
}) => {
  test.setTimeout(180_000);
  const dir = savesDir(userDataDir);
  const saveId = await reachMatchDay(page, userDataDir);

  // A Quick result commits at once; accept it so the Matchday's lines are written.
  const quick = page.getByRole("button", { name: "Quick result" });
  await expect(quick).toBeEnabled({ timeout: 15_000 });
  await quick.click();
  const accept = page.getByRole("button", { name: "Accept result" });
  await expect(accept).toBeVisible({ timeout: 10_000 });
  await accept.click();
  await expect(page.getByText("Result accepted. Continue to move on.")).toBeVisible({ timeout: 15_000 });

  const player = await userStarterOf(path.join(dir, `${saveId}.sqlite`));

  await goto(page, "squad");
  await page.getByRole("button", { name: `${player.lastName}, ${player.firstName}` }).click();
  const main = page.getByRole("main", { name: `${player.firstName} ${player.lastName}` });
  await expect(main).toBeVisible();
  await page.getByRole("navigation", { name: "Player sections" }).getByRole("button", { name: "Form", exact: true }).click();

  // The recent games and the season block render, and the just-played fixture carries a rating.
  await expect(main.getByRole("heading", { name: "Form", exact: true })).toBeVisible();
  const games = main.getByRole("table", { name: "Recent games" });
  await expect(games).toBeVisible();
  await expect(main.getByRole("region", { name: "Season totals" })).toBeVisible();
  await expect(games.getByText(/^\d{1,2}\.\d$/).first()).toBeVisible();
});
