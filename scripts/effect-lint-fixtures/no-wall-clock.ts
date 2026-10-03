/* oxlint-disable */

/**
 * no-wall-clock fixture (gate-red-on-dev ticket 09).
 *
 * Stands in for a game-rule module that computes an age from the machine's clock instead of the
 * Season's game date. `scripts/effect-lint.ts` asserts every gate run that this fixture trips its
 * `no-wall-clock` rule; the fixture is intentionally not part of any package.
 */
export const ageNow = (dateOfBirth: string): number =>
  new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
