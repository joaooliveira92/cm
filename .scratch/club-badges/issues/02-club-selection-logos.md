# 02: Logos in club selection for Premier League and La Liga careers

**What to build:** A manager starting a Premier League or La Liga career sees each club's real logo
next to its name in the club selection step. A manager starting a fictional-names career sees a
shield in each club's primary colours with the club's initials. No logo is ever stretched, and a
missing or broken logo never leaves an empty slot.

This slice runs through every layer:

- **Draft mappings.** The import script gains a mode that drafts a pack's club-to-logo mappings by
  fuzzy-matching the pack's club names against the library. The English and Spanish drafts (20 clubs
  each) are reviewed and committed into those packs' `clubBadges`. Runtime never matches by name.
- **Resolver.** The main-process display-names seam gains a club-badge resolver beside the
  club-colour resolver, bound to the same single read of the save's pack.
- **Read model.** The club selection read model carries `badgeKey`, a key or null, per club.
- **Renderer.** One module owns the bundled logo folder and turns a key into a URL. One `ClubBadge`
  component renders the image fitted inside a square box. It falls back to the colour-and-initials
  shield when the key is null or unknown, or when the image fails to load.

**Seam:** the club selection read keeps its current error channel and services. It gains a nullable
field and no new failure: a club with no mapping, or a mapping to an unknown key, resolves to null,
never to an error or a defect.

**Decisions:**

- `ContentPack` gains `clubBadges`, canonical club id to badge key, and mappings are drafted by fuzzy match and then reviewed. Matching by name never happens at runtime. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- A club-badge resolver sits beside the club-colour resolver, bound to the same single read of the save's pack. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- Read models that show a club carry `badgeKey: string | null`, added per screen as it adopts logos. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- The renderer bundles the library through Vite, and one module turns a key into a URL. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).
- One `ClubBadge` component renders every logo, fitted without stretching, with a colour-and-initials shield as the fallback. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-11-club-badge-library.md).

**Blocked by:** 01 (Logo library and import script).

**Status:** ready-for-agent

- [ ] The English and Spanish packs map all 20 of their clubs to keys present in the manifest, including clubs absent from the dump's current top-flight folder (e.g. Burnley). The integrity test from 01 passes.
- [ ] A generated Premier League save and a generated La Liga save return a non-null `badgeKey` for every club in the club selection read. A fictional-pack save returns null for every club.
- [ ] `ClubBadge` renders an image with the logo's URL for a known key, and the colour-and-initials shield for a null key, an unknown key, or an image load error.
- [ ] The image keeps its aspect ratio inside a square box.
- [ ] The club selection screen test shows a logo reaching a club row.
- [ ] Logos load in the dev app and in a production renderer build.
- [ ] `pnpm check:all` passes.
