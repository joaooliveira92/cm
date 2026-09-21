import { describe, expect, it } from "vitest";
import { isInsideCareer } from "../../../src/renderer/actions/registry.js";
import { screenIdOfPath } from "../../../src/renderer/keyboard/screenId.js";

/**
 * The spine registers the career-global handlers, `g b` included, only on a screen `isInsideCareer`
 * accepts. A route segment mapped to a new screen id without adding that id to its scope list
 * leaves the page with a dead keyboard: `player/$id/development` was mapped to `playerDevelopment`
 * while `PLAYER_SCOPED_SCREENS` still lacked it, and `g b` stopped working there.
 */
const SAVE = "/career/00000000-0000-0000-0000-000000000000";

describe("every scoped career route resolves to a screen inside the career", () => {
  it.each([
    `${SAVE}/player/p1/profile`,
    `${SAVE}/player/p1/contract`,
    `${SAVE}/player/p1/development`,
    `${SAVE}/player/p1/coach-report`,
    `${SAVE}/player/p1`,
    `${SAVE}/club/c1/staff`,
    `${SAVE}/club/c1/scout-report`,
    `${SAVE}/club/c1/information`,
    `${SAVE}/competition/k1/overview`,
    `${SAVE}/competition/k1/table`,
  ])("%s", (path) => {
    const screen = screenIdOfPath(path);
    expect(isInsideCareer(screen as never), `${path} resolved to "${screen}"`).toBe(true);
  });
});
