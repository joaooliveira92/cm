# 11: Create-career surface — fields and the pre-career chrome band

**What to build:** a player creating a career runs through a flow that feels like the same product, with a clear sense of progress. The career-creation screens (league selection, club selection, manager form) render inside a light gradient pre-career chrome band that carries identity at the top, a Cancel/Back control, and an in-band "Step N of 4" indicator where the floating step badge used to be — so progress is read from the band, not from a detached chip on the page. The Save List stays a standalone boot screen, untouched by this band.

Every form field in the flow shares one pattern: an opaque field surface (a field must read typed characters against an unwashed background), a thin rim, a single focus ring on `:focus-visible`, and 12px labels — so league lists, text inputs, and the manager form look consistent. Checkbox accents align to the primary-action hue rather than introducing a competing accent colour.

This ticket is the fields-and-frame clause of the layout-grammar decision only; the grouped overlay anatomy and the empty/error grammar are separate tickets.

The slice's edge promise: fields are class-string constants, not a component library, so the flow composes the same utilities everything else does; the frame is a shell for the creation flow's existing screens, which keep their own logic. Callers observe the flow's progress through the in-band indicator and the shared field surface only.

**Decisions:**

- **Four patterns: `FIELD_*` constants + a new `--color-field-bg` token (constants, not components); a lightweight pre-career chrome band with an in-band "Step N of 4" indicator replacing the floating `StepBadge`.** See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-31-layout-grammar-beyond-tables.md).

**Blocked by:** 08 — Token foundation, alias-first repaint, and the slate guard (the `FIELD_*` constants, the `--color-field-bg` token, and the band's tokens all come from the token system shipped there).

**Status:** ready-for-agent

- [ ] The creation flow renders inside a light gradient pre-career chrome band carrying identity, with Cancel/Back and an in-band "Step N of 4" indicator; the floating step badge is gone and the Save List boot screen is unchanged.
- [ ] Every field in the flow shares one look: opaque field surface, thin rim, single focus ring on `:focus-visible`, 12px labels.
- [ ] Checkbox accents use the primary-action hue, not a second accent colour.
- [ ] Fields are class-string constants composed with the same utilities as the rest of the renderer — no field component library is introduced.
- [ ] `pnpm check:all` is green at this commit.