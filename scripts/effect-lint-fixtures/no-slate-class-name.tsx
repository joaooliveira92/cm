/* oxlint-disable */

/**
 * no-slate-class-name fixture (visual design language, ticket 08).
 *
 * This file stands in for a screen that reaches for flat `slate-*` styling
 * after the chrome-blue frame was adopted — the exact failure mode the guard
 * exists to prevent. It covers all three shapes the rule must see: a plain
 * string attribute, a template literal with an interpolation, and a class list
 * hoisted into a constant before it ever reaches a `className`.
 *
 * `scripts/effect-lint.ts` asserts every gate run that this fixture trips its
 * `no-slate-class-name` rule; the fixture is intentionally not part of the app.
 */
const HOISTED = "rounded bg-slate-700 px-3 py-1";

export const FlatSlateFixture = ({ active }: { readonly active: boolean }) => (
  <div className="bg-slate-950 text-slate-100">
    <button className={`${HOISTED} ${active ? "text-slate-400" : ""}`} type="button">
      Continue
    </button>
  </div>
);
