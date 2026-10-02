# 04: Retiring the appearance preference

Type: grilling
Blocked by: 02
Status: resolved

## Question

The colour picker goes (binding decision 2). What replaces it, exactly? Decide: whether the
Preferences dialog's Appearance section is removed or keeps any option; what happens to a saved
`localStorage` choice on first launch after the change; whether `palettes.css` and the
`theme-neutral` variant are deleted or kept dormant; and the complete mapping of the shadcn palette
variables (`--background`, `--card`, `--primary`, `--muted`, `--border`, `--ring`, `--chart-1`, ...)
onto CM's fixed colours, including where the CM yellow is a role (titles, hints, highlight) and
where it must not be (body text).

## Answer

**The picker's swatches go, the stored key is deleted on startup, the palette code is deleted, and
every colour role gets one fixed CM colour; two yellows as in CM, a title yellow for titles, hints,
own club, selection and focus and a value yellow for values, never on body text or buttons**
(amended after the reference catalogue showed CM colours values yellow). See [Agent Note](../../../.agents/notes/proposed/architecture/2026-10-02-cm-look-replaces-the-appearance-picker.md).
