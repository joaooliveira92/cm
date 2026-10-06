/**
 * The fit rules on their own, without a DOM. The screen-level behaviour (clicking, the escape
 * hatch, the two layouts) lives in `lineup-fit-context.test.tsx`; this file is where the ORDER is
 * pinned down, because that is the part a re-render or a prop change could quietly break without
 * any assertion noticing.
 *
 * Tier names are the shared `FAMILIARITY_TIERS` values, not the ticket's "natural / accomplished /
 * others" paraphrase — the same three, in the same order, as CONTEXT.md names them.
 */
import { describe, expect, it } from "vitest";
import { FAMILIARITY_TIERS } from "@cm-clone/shared";
import {
  fitRankOf,
  prioritiseForPosition,
  tierLabel,
  type FittableRow,
} from "../../../src/renderer/squad/lineupFit.js";
import { suitabilityFor } from "../../setup/positionFixtures.js";

/** The shape the fit rules read: Suitability at one Position, unfamiliar everywhere else. */
const row = (id: string, position: string, familiarity: string): FittableRow => ({
  id,
  suitability: suitabilityFor(position, familiarity),
});

/** A player who cannot play DC at all. */
const outfield = (id: string): FittableRow => row(id, "ST", FAMILIARITY_TIERS[0]);

/** The ids of an ordering, which is what every assertion here is really about. */
const idsOf = (rows: readonly FittableRow[]): string[] => rows.map((r) => r.id);

describe("fitRankOf", () => {
  it("reports the tier a player fills the slot at, and null when he is Unfamiliar there", () => {
    expect(fitRankOf(row("a", "DC", "natural"), "DC")).toBe(0);
    expect(fitRankOf(row("a", "DC", "competent"), "DC")).toBe(1);
    expect(fitRankOf(row("a", "DC", "unfamiliar"), "DC")).toBeNull();
    expect(fitRankOf(outfield("a"), "DC")).toBeNull();
  });

  it("reads nothing for a row without a Suitability map, as a rival's squad has none", () => {
    expect(fitRankOf({ id: "rival" }, "DC")).toBeNull();
  });

  it("does not match a Position that merely starts the same letters", () => {
    expect(fitRankOf(row("a", "DC", "natural"), "D")).toBeNull();
  });
});

describe("prioritiseForPosition", () => {
  it("puts every fitting player above every player who cannot fit, best tier first", () => {
    const rows = [
      outfield("keeper"),
      row("loose", "DC", "unfamiliar"),
      row("solid", "DC", "competent"),
      row("homegrown", "DC", "natural"),
      outfield("winger"),
    ];
    expect(idsOf(prioritiseForPosition(rows, "DC").ordered)).toEqual([
      "homegrown",
      "solid",
      "keeper",
      "loose",
      "winger",
    ]);
  });

  it("keeps the order it was given inside a tier, so the screen's own sort is the tiebreak", () => {
    const rows = [
      row("c", "DC", "natural"),
      row("a", "DC", "natural"),
      row("b", "DC", "natural"),
    ];
    expect(idsOf(prioritiseForPosition(rows, "DC").ordered)).toEqual(["c", "a", "b"]);
  });

  it("hides nobody: the result is a permutation of what it was given", () => {
    const rows = [
      outfield("x"),
      row("a", "DC", "unfamiliar"),
      row("b", "DC", "natural"),
      outfield("y"),
      row("c", "DM", "natural"),
    ];
    const ordered = prioritiseForPosition(rows, "DC").ordered;
    expect(ordered).toHaveLength(rows.length);
    expect([...idsOf(ordered)].sort()).toEqual([...idsOf(rows)].sort());
  });

  it("leaves the caller's array alone", () => {
    const rows = [outfield("x"), row("a", "DC", "natural")];
    const before = idsOf(rows);
    prioritiseForPosition(rows, "DC");
    expect(idsOf(rows)).toEqual(before);
  });

  it("reports the tier of each fitting row and nothing else", () => {
    const rows = [row("a", "DC", "competent"), outfield("b"), row("c", "DC", "natural")];
    const { rankById } = prioritiseForPosition(rows, "DC");
    expect(rankById.get("a")).toBe(1);
    expect(rankById.get("c")).toBe(0);
    expect(rankById.has("b")).toBe(false);
  });

  it("leaves the order untouched when nobody fits", () => {
    const rows = [outfield("x"), outfield("y"), outfield("z")];
    expect(idsOf(prioritiseForPosition(rows, "DC").ordered)).toEqual(["x", "y", "z"]);
  });

  it("handles an empty squad", () => {
    expect(prioritiseForPosition([], "DC").ordered).toEqual([]);
  });

  it("ranks a multi-Position player on the tier for THIS slot, not their best one", () => {
    const multi: FittableRow = { id: "multi", suitability: { ST: 19, DC: 16, DL: 8 } };
    expect(fitRankOf(multi, "DC")).toBe(1);
    expect(fitRankOf(multi, "ST")).toBe(0);
    expect(fitRankOf(multi, "DL")).toBeNull();
  });
});

describe("tierLabel", () => {
  it("sentence-cases a tier for user-facing text", () => {
    expect(tierLabel("natural")).toBe("Natural");
    expect(tierLabel("unfamiliar")).toBe("Unfamiliar");
  });
});
