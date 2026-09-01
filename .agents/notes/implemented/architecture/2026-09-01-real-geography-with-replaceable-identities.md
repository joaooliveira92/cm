# Agent Note: Real geography, replaceable identities

Status: implemented

## Problem

The setup catalogue shipped twelve invented Nations across six invented regions — Aravia, Caldonia,
the Northern Reach. The structures were modelled on real pyramids, but nothing a player recognised
survived: choosing where to manage meant choosing between names with no meaning attached.

[`docs/research/real-data-spec.md`](../../../../docs/research/real-data-spec.md) §1 argues the
opposite boundary, and the user approved adopting it: real geography is factual, stable, and cheap
to be correct about, while the things that carry legal risk — club names, competition brands, badges,
kits — are a *different category* that should never have been coupled to it in the first place. The
old catalogue conflated the two and paid the cost of fictionalising both.

## Decision

**Geography is real; identities are replaceable.** The two are separated by module, not by
convention:

- `packages/shared/src/nations.ts` — real countries, ISO 3166-1 alpha-3 codes, continents, FIFA
  confederation membership, languages, currency codes. Plus a `NationProfile` per Nation.
- `packages/shared/src/contentPack.ts` — the canonical-id-to-display-name layer. The simulation core
  refers to `club_esp_01`; a content pack decides whether that reads as fictional, licensed,
  localized, or a test fixture.
- `packages/shared/src/leagueSetup.ts` — the catalogue, now real Nations. Competition names are
  structural descriptions ("English First Division"), never real competition brands, and **no club is
  named in it at all**.

Six Nations ship playable content (England, Spain, Portugal, France, Germany, Brazil, across UEFA and
CONMEBOL), joined by Andorra as a real association with background data only and Italy as a real
association present in metadata with no content shipped. Those last two are not filler: they are how
a real database ships partial coverage, and they carry the `playableSupported: false` and
`available: false` shapes the selection model must survive.

**Nation profiles are gameplay priors, and the file says so in as many words.** Every 0-1 weight —
`youthProduction`, `exportTendency`, the tactical leanings, the migration links — is a tuning knob
for a generated world, never a factual claim about a country or its people. Two rules govern
consumption and are what let the file exist at all: a prior *shifts a distribution* rather than
setting a value, and individual variance must exceed the national modifier. A generator that inverts
that ratio produces caricatures and is wrong.

**Migration links are directional recruitment weights, not migration statistics.** `PRT -> BRA` is
non-zero and `BRA -> PRT` is zero, and a test asserts that asymmetry so a future tidy-up cannot
mirror the table into something that reads as a claim about people.

## What was explicitly not adopted

The spec's §6 player model — Current Ability and Potential Ability both on 1-200 — was **rejected by
the user and is not implemented.** `CONTEXT.md` continues to reject a persisted Current Ability
scalar: player quality remains individual Attributes on 1-20 with Potential Ability on 1-100, and
Overall Rating stays a read-time projection. Nothing in this change touches ratings, development, or
transfer value. Anyone reading the spec alongside the code should expect that divergence and not
"fix" it.

Real *club* names are likewise not adopted. The content-pack layer makes them possible; the shipped
base pack is fictional, so the default build carries no licensing question.

## Alternatives considered

- **Keep the fictional catalogue.** Rejected by the user's decision, and on the merits: fictionalising
  geography bought nothing legally — country names carry no trademark — while costing every bit of
  recognition the selection screen exists to offer.
- **Real competition brands too** ("Premier League", "Bundesliga"). Rejected: these are exactly the
  licensed commercial assets §1 puts behind the content-pack boundary. Structural names cost nothing
  and keep the base build shippable.
- **Only the six spec Nations.** Rejected: it drops the `unavailable` and no-playable-league shapes
  the resolver is built around, and those shapes are more honestly carried by real partial coverage
  than by an invented placeholder.
- **Nation behaviour as code branches** (`if (nation === "BRA")`). Rejected: country behaviour in
  code cannot be recalibrated, reviewed as a set, or replaced by a content pack. §4's whole argument
  is that these belong in data.

## Consequences

- **The catalogue fingerprint moved to `real-geography@1.0.0`.** Every persisted preset and setup
  draft from the old catalogue is refused rather than half-restored against ids that no longer mean
  the same thing. This is the fingerprint mechanism working as designed, not a migration gap.
- **`beginCareer` still generates the fixed 20-club League** and still does not read the selection
  snapshot. That gap predates this change and is untouched by it; the Nations are now real, but
  nothing yet materializes a multi-Nation world.
- **Nation ids stay `nation-eng`-shaped, with the ISO code as a separate `code` field.** The
  confederation branches carry a member Nation's code because they are tournament containers rather
  than territories — a wart, and the place to look first if `code` ever becomes load-bearing.
- **The catalogue now has referential-integrity tests** (dependency edges resolve, scope options
  reference their own Nation's competitions, ids are unique, unavailable Nations ship no content) —
  §10's validation applied to the one data structure the whole selection screen trusts.
- `docs/research/real-data-spec.md` remains a research document, not a spec this repo has adopted
  wholesale. §1 is adopted here; §2 shipped in
  [deterministic world generation](2026-09-01-deterministic-world-generation-and-drizzle-schema.md);
  §6's ability model is rejected outright.
