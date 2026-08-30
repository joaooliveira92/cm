/* oxlint-disable */

/**
 * renderer-boundary fixture (Stage 1 — keyboard-first renderer).
 *
 * This file stands in for a career screen that reaches past the `renderer/rpc` seam:
 * `window.cmClone.call` directly and the two direct package imports the boundary forbids.
 * `scripts/effect-lint.ts` asserts every gate run that this fixture trips its
 * `renderer-boundary` rule; the fixture is intentionally not part of the app.
 */
import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/unstable/reactivity";

export const BoundaryViolationFixture = ({ saveId }: { readonly saveId: string }) => {
  const directCall = window.cmClone.call("getSquad", { saveId });
  void Atom;
  return <div>{useAtomValue(Atom.succeed(directCall))}</div>;
};