/* oxlint-disable */

/**
 * no-raw-text-size fixture.
 *
 * A screen that sizes its text with Tailwind's numeric scale instead of a
 * type-scale role, in the shapes the rule must see: a plain attribute, a
 * responsive variant inside a template literal, an arbitrary pixel size, and a
 * class list hoisted into a constant. `text-text-secondary` (a colour) and
 * `text-heading` (a role) sit beside them and must not trip it.
 *
 * `scripts/effect-lint.ts` asserts every gate run that this fixture trips its
 * `no-raw-text-size` rule; the fixture is intentionally not part of the app.
 */
const HOISTED = "text-xs text-text-secondary";

export const RawTextSizeFixture = ({ wide }: { readonly wide: boolean }) => (
  <section>
    <h2 className="text-2xl font-bold">Squad</h2>
    <p className={`text-heading ${wide ? "sm:text-lg" : ""}`}>Heading</p>
    <span className="text-[11px]">Status</span>
    <span className={HOISTED}>Hint</span>
  </section>
);
