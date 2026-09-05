import { describe, expect, it } from "vitest";
import { BINDING_SHAPE, LOCKED_INFRA_BINDINGS as MAIN_LOCKED } from "../src/main/rpc/index.js";
import { LOCKED_INFRA_BINDINGS as RENDERER_LOCKED } from "../src/renderer/actions/registry.js";
import { isValidBindingShape } from "../src/renderer/actions/overrides.js";

/**
 * Drift guard (F3) for main's locked-key / binding-shape mirror.
 *
 * Main keeps two string-level guards in `src/main/rpc/keybindings.ts` (`LOCKED_INFRA_BINDINGS` and
 * `BINDING_SHAPE`) as a documented backstop for a misbehaving client: a bad binding must never
 * persist even if the renderer is bypassed. The renderer is the authority — it knows the
 * registry, the defaults, and the collisions, which main never sees — so main's mirror is safe
 * ONLY while its semantics stay equal to the renderer's. These tests compare the two sides
 * directly for exactly the vectors the framework can express (and the ones it cannot), so a
 * silent drift — a locked key added on one side, a shape rule loosened on the other — fails this
 * file instead of shipping. Nothing here crosses the main/renderer runtime seam: both modules are
 * imported by the test, neither imports the other.
 */

const VALID_BINDINGS = ["a", "z", "5", "Space", "Primary+k", "g s"];

const INVALID_BINDINGS = [
  "g", // the bare g starts the prefix machine — reserved by an explicit check on both sides
  "ArrowDown",
  "F5",
  "Primary+HK", // multi-key chord: the framework captures one key after Primary, nothing else
];

describe("F3 — the main-side locked set is the renderer's locked set", () => {
  it("both sides enumerate exactly the same 4 locked infrastructure keys", () => {
    expect(new Set(MAIN_LOCKED)).toEqual(new Set(RENDERER_LOCKED));
    expect(MAIN_LOCKED.size).toBe(4);
    expect(RENDERER_LOCKED).toHaveLength(4);
  });
});

describe("F3 — the two shape guards agree on the framework's expressible set", () => {
  // What main's guard actually lets through — locked-key check, the bare-g reservation, then its
  // shape regex — is exactly the sequence `setKeyBindingOverride` runs. The renderer's equivalent
  // capacity is the same three checks over its own constants.
  const mainAccepts = (binding: string): boolean =>
    !MAIN_LOCKED.has(binding) && binding !== "g" && BINDING_SHAPE.test(binding);
  const rendererAccepts = (binding: string): boolean =>
    !RENDERER_LOCKED.includes(binding) && binding !== "g" && isValidBindingShape(binding);

  it("the grammar tests agree on every sample vector", () => {
    // `g` alone is grammatically a bare key on BOTH sides (the reservation is the separate
    // policy check below), so the grammar agreement here is `===`, not "reject".
    for (const binding of [...VALID_BINDINGS, ...INVALID_BINDINGS]) {
      expect(BINDING_SHAPE.test(binding)).toBe(isValidBindingShape(binding));
    }
  });

  it("every valid vector is accepted by both sides", () => {
    for (const binding of VALID_BINDINGS) {
      expect(mainAccepts(binding), `main rejects valid ${binding}`).toBe(true);
      expect(rendererAccepts(binding), `renderer rejects valid ${binding}`).toBe(true);
    }
  });

  it("every invalid vector is rejected by both sides", () => {
    for (const binding of INVALID_BINDINGS) {
      expect(mainAccepts(binding), `main accepts invalid ${binding}`).toBe(false);
      expect(rendererAccepts(binding), `renderer accepts invalid ${binding}`).toBe(false);
    }
  });

  it("the effective binding policies agree per vector (the drift surface)", () => {
    for (const binding of [...VALID_BINDINGS, ...INVALID_BINDINGS, ...MAIN_LOCKED]) {
      expect(
        mainAccepts(binding),
        `main and renderer disagree on "${binding}" (the mirror has drifted)`,
      ).toBe(rendererAccepts(binding));
    }
    // Escape, Enter, and the two Primary chords are locked infrastructure keys — neither side
    // lets one through as a NEW binding no matter its shape.
    for (const locked of MAIN_LOCKED) expect(mainAccepts(locked)).toBe(false);
  });
});