# Map: visual-design-language

Label: wayfinder:map

> Status: charted. Tickets 01 and 02 resolved (current state audit, visual frame tokens). Tickets 03 and 04 now unblocked.

## Destination

A **spec** at `.scratch/visual-design-language/spec.md` describing the visual design language, UI element inventory, and interaction patterns for the `@cm-clone/desktop` renderer — grounded in the CM 03/04 UI analysis at `docs/ui-elements.md`. The map decides which design choices from the original game the clone faithfully reproduces, which it adapts, and which it drops, and produces a spec that a renderer implementation effort can consume. Plan-only: the map is done when nothing is left to decide and the spec can be handed to `/cm-to-spec` → `/cm-to-tickets` → `/cm-implement`.

## Notes

- Domain: the `@cm-clone/desktop` Electron renderer (React 19, Tailwind 4, Effect stack). Currently functional but minimalist (dark slate theme, basic tables, nav tabs).
- **Source material**: `docs/ui-elements.md` — 533 lines analyzing CM 03/04's UI: entry flow, squad table, status abbreviations, navigation model, news/task surface, tactics/training screens, and visual design language (dense, text-led, abbreviated, skin-based).
- The existing [keyboard-first-renderer](../keyboard-first-renderer/map.md) effort charts keyboard accessibility for the same renderer. Its decisions (Action registry, focus model, command palette) are **design decisions we implement on top of, not re-litigate**. This map's visual decisions must not contradict keyboard-first's interaction model (e.g., roving tabindex in tables, `g <key>` navigation).
- The existing [onboarding](../onboarding/map.md) effort charts the new player flow. This map covers the visual design that onboarding screens render *in* — the two efforts are complementary.
- The [retro-match-screen](../retro-match-screen/map.md) effort handles match-day visuals separately. If its disposition is "keep and finish", match-day visual fidelity decisions live there, not here.
- There is no existing attempt to capture the CM 03/04 visual language in the clone. The current renderer uses default Tailwind classes — bevels, shading, compact tables, skin system, background images, and typography are entirely unaddressed.
- Skills: grilling + domain-modeling for the frame-defining tickets; research for reference-gathering; task for inventory compilation; doc-standards + writing-for-agents for the spec.
- Say names, not bare ids.

## Decisions so far

<!-- the index: one line per closed ticket, enough to judge relevance, then zoom the link for the detail the ticket holds -->

(none yet — this is a freshly charted map)

- [Current visual state audit](issues/01-current-visual-state-audit.md): 9-dimension audit: main renderer uses flat dark slate (modern/modified or no-equivalent on every axis vs CM 03/04). Match-screen component has a closer prototype but is unwired. Research note at `docs/research/visual-design-language-current-state.md`.

- [Visual frame and design tokens](issues/02-visual-frame-tokens.md): **Retro chrome-blue visual frame adopted** — palette (dark base, chrome-blue gradients, panel-dark surfaces), typography (Trebuchet MS, 12px table body), panel system (semi-transparent borders), two-tier buttons (gradient primary, flat secondary), compact density (py-0.5 rows). Skin system deferred. Agent Note at `.agents/notes/proposed/architecture/2026-08-29-visual-design-tokens.md`.

## Not yet specified

- **Skin system architecture.** CM 03/04 supported multiple skins (traditional, Ter), context-sensitive backgrounds per screen, and a title-bar image/logo zone. Whether the clone ships a skin system or a single fixed theme is a decision that may ripple into the whole visual design — expect it to emerge as a ticket once the visual frame is settled.

- **Match-day visual language.** The retro-match-screen effort owns match-day visual decisions. Once that map's disposition (keep/delete scaffold) is known, some of this map's design tokens may need to align with that screen's styling — or the match screen may carve its own lane.

- **Abbreviation vocabulary UI.** CM 03/04's status abbreviations (Lmp, Inj, Sus, etc.) are a dense visual vocabulary. Some of these map to existing game concepts (Inj → Injury, Sus → Suspended); others have no modeled equivalent. Whether the clone renders statuses as abbreviations, icons, full text, or hybrid — and which abbreviations survive — is a design decision that depends on which game systems ship.

## Out of scope

- **Keyboard-first interaction design.** That is `.scratch/keyboard-first-renderer`'s destination. This map produces visual design tokens and layout patterns that keyboard implementations render through; it does not design keyboard behavior or bindings.

- **Match-day screen visuals.** Owned by `.scratch/retro-match-screen`. This map's tokens (colors, typography, panel styling) apply to match-day if that effort chooses to adopt them, but the match screen's layout, fidelity targets, and interaction design are not this map's decisions.

- **Onboarding feature flow.** The sequence of screens, the league-selector UI, and the manager-creation form flow are `.scratch/onboarding`'s domain. This map provides the visual shell those screens render in.

- **Writing the actual CSS and React components.** Plan-only: this map hands a spec to implementation. It does not author renderer code.

- **Game domain vocabulary in this spec.** UI design language terms (panel, tab, badge, abbreviation) stay in the spec, not in `CONTEXT.md`, which is a pure game-domain glossary.