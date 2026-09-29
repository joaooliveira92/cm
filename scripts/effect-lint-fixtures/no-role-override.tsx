/* oxlint-disable */

/**
 * no-role-override fixture.
 *
 * A screen that re-sizes role-owning primitives through `className`, in the
 * shapes the rule must see: a plain attribute, a `cn(...)` call, a responsive
 * variant in a template literal, and a class list hoisted into a constant. Beside
 * them sit what must not trip it: a colour on a primitive (`text-text-secondary`),
 * a role on a plain element, and a figure on `KeyValueValue`, which is left out
 * of the rule on purpose.
 *
 * `scripts/effect-lint.ts` asserts every gate run that this fixture trips its
 * `no-role-override` rule; the fixture is intentionally not part of the app.
 */
const HOISTED = "px-2 text-body";

export const RoleOverrideFixture = ({ wide }: { readonly wide: boolean }) => (
  <section>
    <Button className="text-body">Save</Button>
    <TableCell className={cn("px-2", "text-caption")}>12</TableCell>
    <TabsTrigger value="a" className={`px-3 ${wide ? "sm:text-heading" : ""}`}>A</TabsTrigger>
    <KeyValueKey className={HOISTED}>Age</KeyValueKey>
    <Badge className="text-text-secondary">New</Badge>
    <p className="text-body">Prose</p>
    <KeyValueValue className="text-figure">20</KeyValueValue>
  </section>
);
