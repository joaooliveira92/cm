# Agent Note: Classify post-handoff decisions by type; close the wayfinder map at handoff

Status: implemented

> Migrated from ADR-0010 when the numbered ADR layer was retired. The original routed architectural
> decisions to `docs/adr/`; that destination no longer exists, and the routing rule below has been
> updated to name `.agents/notes/{lifecycle}/architecture/` instead. Nothing else changed.

## Problem

A wayfinder map charted a route to a written spec, reached it, and handed off to `/to-spec` →
`/to-tickets` → `/implement`. Implementation then surfaced decisions the map had not anticipated: one
ticket refactored the match engine to consume resolved flat phase-slots, another rewrote the match
engine's boundary wording to match. Neither the upstream wayfinder skill nor this repo had defined where
such a mid-implementation decision should be recorded.

A single rule sending *every* post-handoff decision to one durable location would give one place to
look, but it would also mix architecture with gameplay, UX, specification corrections, and local
implementation choices. Post-handoff discoveries are not one kind of thing. Some change architectural
boundaries; others merely correct an assumption in the handed-off spec, settle a feature's behavior, or
are nothing more than local build detail. Classifying them by *when* they were discovered rather than
*what they are* is the wrong axis.

## Decision

**Post-handoff discoveries are classified by their nature and impact, not by the phase in which they
were discovered.** The wayfinder map closes at handoff as a historical planning artifact; routine
implementation activity does not reopen or extend it. But the handed-off specification is not treated as
infallible merely because handoff occurred.

The classification:

- **Local implementation decisions** — function naming, file placement, internal helper extraction,
  equivalent local data structures, test organization, noncontractual rendering detail — stay in the
  implementation ticket or code review. No decision record, no map amendment. Use this path when the
  decision does not alter observable behavior, does not change the domain model, does not affect another
  ticket, does not set a repository-wide precedent, and can be reversed locally.
- **Specification corrections** — a specified field that does not exist, a described simulation path that
  is factually wrong, a supposedly persisted value that is actually derived, a required input that is not
  player-reachable — amend the handed-off specification with an explicit correction block and cross-link
  the implementation ticket. This preserves history without leaving the current contract false:

  > **Corrected during implementation**
  >
  > The original specification stated ...
  > Implementation audit established ...
  > The authoritative contract is now ...
  > See ticket NN and the relevant Agent Note where applicable.

- **Gameplay and UX decisions** — whether Club Challenge labels are shown, whether Quick Result exists,
  whether a started match can be abandoned, whether Training Focus appears on Squad, how qualitative
  Squad Quality bands work, what player-facing information is disclosed — are recorded in a
  `feature`-class Agent Note or the ticket, or a focused map when substantial exploration is required.
  These may be durable without being architectural; they update the relevant specification because they
  change the product contract.
- **Architectural decisions** — decisions that change or establish domain boundaries, persistence shape,
  event semantics, replay guarantees, determinism, package dependency direction, IPC or security
  contracts, long-term compatibility, or repository-wide implementation constraints — are recorded as
  `architecture`-class Agent Notes under `.agents/notes/{lifecycle}/architecture/`. A decision that
  affects multiple components and constrains future implementation belongs here.

**A fresh wayfinder map is not required merely because a decision appears during implementation.** It is
appropriate only when implementation reveals a new unresolved destination with multiple consequential
routes — a genuinely new domain area, a save-migration strategy, a routing decision with real trade-offs.
Such a map remains available after the original closes.

**The map closes at handoff** as a historical planning artifact, not because the way is proven
error-free. It may receive a continuity pointer in Decisions-so-far when a later record supersedes or
materially qualifies one of its decisions; the full later decision lives in its appropriate artifact. The
map is never silently rewritten to make later discoveries look anticipated.

**Items marked `Not yet specified` at handoff remain unresolved at the product level** unless explicitly
rejected, deferred to a named owner, or resolved by a later record. `Not yet specified` (in-scope fog),
`Out of scope` (intentionally excluded from one effort's delivery boundary), and `Deferred` (owned by a
named later effort) are distinct states. Moving an unresolved item into one specification's Out of Scope
section does not settle it globally.

**Mixed `issues/NN-*.md` numbering is accepted process debt.** This decision introduces no migration or
naming convention. Absence of a `Type:` line is a fragile discriminator — it may be accidental — and
future repository-organization work may address it. It is recorded as accepted debt, not declared
non-defective.

## Alternatives considered

- **Route every post-handoff decision to one directory.** Rejected: it buries architecture under UX,
  gameplay, tuning, and copy decisions, so the durable layer stops being scannable.
- **Classify by discovery phase** — "anything found after handoff goes here." Rejected as the wrong axis:
  when something was discovered says nothing about how durable or far-reaching it is.
- **Reopen the map for post-handoff decisions.** Rejected: the map becomes a perpetually-open index
  accreting build-era noise, and loses its value as a readable record of the planned route.

## Consequences

- The durable decision layer stays focused; it does not become a general-purpose log.
- The handed-off specification can be corrected or superseded when implementation disproves an
  assumption.
- The wayfinder map remains readable as the historical planning route, with a defined end.
- Routine build details accumulate in neither the map nor the notes directory.
- A new map remains available when implementation reveals a genuinely new destination; map closure is not
  a one-way door.
- Post-handoff discoveries require classification by nature and impact rather than automatic placement.
  This is an additional judgment step for the implementer.
- `Not yet specified`, `Out of scope`, and `Deferred` remain distinct states; unresolved fog is not
  laundered into a permanent non-question by being boxed under an Out of Scope heading.
