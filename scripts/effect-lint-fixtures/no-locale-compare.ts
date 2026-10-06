/* oxlint-disable */

/**
 * no-locale-compare fixture (group-g ticket 38).
 *
 * Stands in for a pure-package module that breaks a sort tie with the host's locale.
 * `scripts/effect-lint.ts` asserts every gate run that this fixture trips its `no-locale-compare`
 * rule; the fixture is intentionally not part of any package.
 */
export const byId = (a: { readonly id: string }, b: { readonly id: string }): number => a.id.localeCompare(b.id);
