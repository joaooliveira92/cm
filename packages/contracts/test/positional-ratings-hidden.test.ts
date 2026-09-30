import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import * as schemas from "../src/schemas/index.js";

/**
 * A player's Line, Side and Free Role Ratings never leave the main process: screens get the compact
 * label, the position filters he can play and his sort order, and per-cell Suitability on the
 * Tactics screen. See
 * `.agents/notes/proposed/feature/2026-09-29-positional-ratings-stay-hidden.md`.
 *
 * The check walks every exported schema's JSON Schema, so a view added later is covered without
 * anyone remembering to list it.
 */
const FORBIDDEN_PROPERTIES = ["freeRole", "lineRatings", "sideRatings", "positionalRatings"];

/** Every property name in a JSON Schema document, plus each object that has both `lines` and
 *  `sides` (the shape of `PositionalRatings`; `lines` alone is a commentary field). */
const inspect = (node: unknown, found: { names: Set<string>; ratingShapes: number }): void => {
  if (Array.isArray(node)) {
    for (const item of node) inspect(item, found);
    return;
  }
  if (typeof node !== "object" || node === null) return;
  const record = node as Record<string, unknown>;
  const properties = record["properties"];
  if (typeof properties === "object" && properties !== null && !Array.isArray(properties)) {
    const names = Object.keys(properties);
    for (const name of names) found.names.add(name);
    if (names.includes("lines") && names.includes("sides")) found.ratingShapes += 1;
  }
  for (const value of Object.values(record)) inspect(value, found);
};

describe("positional ratings stay hidden", () => {
  const exported = Object.entries(schemas).filter(([, value]) => Schema.isSchema(value));

  it("finds the schemas to inspect", () => {
    expect(exported.length).toBeGreaterThan(100);
  });

  it("exposes no Line, Side or Free Role Rating on any contract schema", () => {
    const offenders: string[] = [];
    for (const [name, schema] of exported) {
      const found = { names: new Set<string>(), ratingShapes: 0 };
      inspect(Schema.toJsonSchemaDocument(schema as never), found);
      const hits = FORBIDDEN_PROPERTIES.filter((property) => found.names.has(property));
      if (hits.length > 0 || found.ratingShapes > 0) offenders.push(`${name}: ${hits.join(", ") || "lines+sides"}`);
    }
    expect(offenders).toEqual([]);
  });

  it("would notice a schema that did expose them", () => {
    const leaky = Schema.Struct({ freeRole: Schema.Finite });
    const found = { names: new Set<string>(), ratingShapes: 0 };
    inspect(Schema.toJsonSchemaDocument(leaky), found);
    expect(found.names.has("freeRole")).toBe(true);
  });
});
