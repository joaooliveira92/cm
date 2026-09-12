# Agent Note: Club colours are pack data, and the header is a CSS scope

Status: implemented

## Problem

Every club needs an identity the chrome can paint itself in: a primary and secondary
foreground/background pair, optionally a tertiary and quaternary. The career header should render in
the user club's primary pair — a club with white-on-black primary gets a white-on-black header.

Three questions had to be settled before any of that could be built: where the colours come from,
which contract carries them, and how a colour reaches a DOM node.

## Decision

**Colours are content-pack data with an id-derived fallback.** They sit on the same side of the
licensing line as club names (`contentPack.ts`): a real club's colours are part of the commercial
identity a licence covers, so the simulation core never asserts that `club_eng_1_01` plays in red.
`ContentPack.clubColours` maps canonical id to scheme, and `displayNames.ts` grew
`clubColourResolver` beside `displayNames` — the same seam, the same single `generation_manifest`
read, so a pack swap can never leave colours and names disagreeing.

Resolution is **total**, and this is where colours depart from names. An unnamed id resolves to the
visible raw `club_eng_2_11`, which is deliberately obvious in a screenshot and reported by
`packCoverageGaps`. There is no equivalent for a colour: a header cannot paint "missing", and an
unpainted one looks exactly like the default chrome — an invisible gap rather than a visible one. So
an uncoloured id falls back to a scheme picked by FNV-1a over the canonical id, and every club
necessarily has a primary and a secondary pair.

**The pair is the unit.** `ColourPair` holds foreground and background together because contrast is
a property of the pair. Separate `primaryForeground`/`primaryBackground` fields would let a pack
author supply one without the other, and let a consumer read one while painting the other — the bug
this shape makes unrepresentable. The fallback palette is authored as pairs drawn from traditional
kit families rather than derived by a contrast formula, which is what produces grey-on-yellow.

**The header is a CSS scope, not a prop.** `--color-header-bg` and `--color-header-fg` are declared
in `@theme` defaulting to the existing neutral chrome. The career header carries the club's primary
pair as two inline custom properties; the `club-header` utility derives border, muted text, and hover
from them *on that same element*; every band inside resolves through normal inheritance. No component
below the header reads a club colour, so a future club-coloured surface is a class change on that
surface rather than a palette threaded through props.

The derived roles are declared in the utility rather than in `@theme` because a custom property's
`var()` references are substituted at computed-value time **on the element that declares it**. A
derivation written in `@theme` resolves against `:root`'s neutral values once and stays resolved no
matter what a descendant overrides. This is the whole reason the mechanism needs two declaration
sites, and it is not obvious from reading either one.

**Only `ManagerProfileScreenView` carries the colours.** They are resolved where the career header
reads them, not hung on `ClubSummary`.

## Alternatives considered

**Colours on `ClubSummary`.** Tried first, and reverted. `ClubSummary` is shared by the squad,
transfer, match, and opponent-list views, none of which paint a club colour; widening it to serve one
consumer made every one of them pay for a field they never read, and broke about twenty test fixtures
that had no stake in the feature. That blast radius was the signal, not an inconvenience — a contract
class shared by four consumers is the wrong home for one consumer's data. The scoreboard is the most
likely second consumer, and when it arrives it can take colours through its own read.

**Generating colours from nation and stature tier.** Rejected. Stature tier is a strength signal;
deriving a palette from it would make the header's colour a readout of how good the club is, which is
both wrong and impossible to override with authored data.

**A seeded `RandomSource` for the fallback,** as `clubGeneration.ts` uses. Rejected: this is not
world generation, it draws no entropy from the world seed, and two saves containing the same club
should agree on its colours. A plain hash of the canonical id gives exactly that.

**Painting the whole navbar.** The section nav and context strip stay on the neutral surface. They
carry their own active and hover chrome, and compositing that over an arbitrary club background is
what turns a legible nav into an unreadable one. The club identity is the band above them.

## Consequences

- A pack author supplies a club's full scheme once; `tertiary` and `quaternary` ride the wire with no
  consumer yet, because the ranks are a property of the club's identity rather than of what this
  build happens to paint.
- Every shell without a club — main menu, save list, creation flow — renders byte-identically to
  before, because the header roles default to the exact neutral values those bands used to name.
- The fallback palette must be **appended to, never reordered**: a save reopened after a reordering
  would show different colours for the same club, which reads as corruption. The test that pins
  determinism does not catch a reorder, because it only compares a scheme against itself.
- Contrast is the pack author's responsibility. Nothing validates that an authored pair is legible,
  and a pack that ships white-on-white gets an invisible header. Worth a validation pass if authored
  packs ever come from outside this repo.
