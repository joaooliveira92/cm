# 03: Screen 7 reconciliation update

**What to build:** The reconciliation ledger stops asserting that nothing of Screen 7 survives, and
starts recording what was built, what is ruled out, and why.

The ledger's Screen 7 section is four sentences and no rows. It reads "Nothing of Screen 7
survives," which was true when it was written and is not true once tickets 01 and 02 ship: §21's
non-silent discard and §22's Career Setup Summary both acquire implementations. A ledger that
describes a screen in a state the code has left is worse than no ledger, so this reconciliation
lands with the code rather than in a later pass.

The section gains a status block recording the re-audit and a row table in the ledger's own shape.
The rows fall into three groups. The multiplayer, network, ownership, permission, and invitation
sections stay `out-of-scope` against the blanket scope trim. The manager-roster sections — slots,
capacity policy, manager drafts and their resume and removal, the managerless career, the
start-unemployed path, and the slot-list semantics and keyboard model that depend on a list — are
`contradicted` against the new-game flow sequence and the one-manager-per-career shape of this game,
each row naming which of the two carries it. The two sections tickets 01 and 02 implement get rows
describing what now holds, or no row at all if the section is followed as written.

The section also records that the import file carries an edit — the removal of `Invite Network
Manager` and `Multiplayer Settings` from §6.4 — against a preamble that says import files are never
edited. The ledger states the edit and its date rather than the edit being reverted or left silent,
so the divergence from its own convention is visible to the next reader.

**Blocked by:** 01 (Leaving career creation confirms before discarding the generated world) and 02
(The Review step becomes the Career Setup Summary) — the rows describe what those tickets build, so
writing them first would describe an unbuilt screen as shipped.

**Status:** resolved

- [x] Screen 7's ledger section carries a status block naming this effort and the re-audit date, and
      no longer claims that nothing of the screen survives.
- [x] Every section of the import is accounted for: a row, or coverage by the status line's silence
      rule at the status the section claims.
- [x] Each row's Anchor points at a decision that exists — an Agent Note, a `CONTEXT.md` term, an
      owning spec group, or `unscheduled` — and no row asserts a disposition without one.
- [x] The rows for the sections tickets 01 and 02 implement describe the shipped behaviour.
- [x] The edit to the import file is recorded in the section, with its date and what it removed.
- [x] `pnpm check:all` is green, including the markdown link check.

## Lock released 2026-09-18

Claimed and abandoned. A stale-lock audit found no trace of the work: the Screen 7 section of the
Group A ledger is still the original four-sentence prose reading "Nothing of Screen 7 survives", with
no row table, no new status block, and no mention of this effort or the §6.4 import edit.

Both blockers (01, 02) shipped — `fdb9230` landed ticket 01's discard confirmation — so this is
unblocked, real work. It also matters more than a docs chore: the published ledger now asserts a
state the code has left, which is exactly what this ticket was written to prevent.

## Answer

Screen 7's section is rewritten: a status block, sixteen rows, and a closing paragraph recording the
import edit. Status moves **Reviewed → Audited**, and the Coverage table at the top of the ledger
moves with it. `Audited` is earned rather than asserted — every one of the import's 41 sections plus
`Suggested Git commit` carries a row, so nothing in this screen rests on the silence rule. The
sections were read, not just their headings.

### What changed about the screen

The old section said "Nothing of Screen 7 survives." Two things now do, and neither is the screen:

- **§21 Back behavior** — `renamed`. This project does not retain managerless careers, so §21's
  second branch applies, and ticket 01 shipped exactly that confirmation. The row records what
  survives *and* what does not: §21's destination list (world-generation success summary, Career
  Setup Summary, Main Menu retaining the checkpoint) has no referent, because leaving goes to the
  Main Menu and nothing is retained.
- **§22 Career Setup Summary** — `renamed`. Ticket 02 shipped it as the Review stage, which is where
  a pre-commit summary belongs once there is no Add Manager screen to hang one off. Three of §22's
  nine lines are dropped for having no referent (seed visibility, multiplayer mode, manager
  capacity) and a fourth, world validation status, is answered by an explicit unavailable line
  rather than a field.

### The three groups

- **`out-of-scope`** against the blanket scope trim: the network, ownership, permission and
  invitation sections (§3.4, §3.6, §9, §10, §11, §16, §17, §23), the multiplayer halves of §27 and
  §28, and §32, §34, §36, whose every clause names a participant, a slot or an invitation.
- **`contradicted`**, each row naming which of the two decisions carries it. Where the conflict is
  about *where the screen sits*, the anchor is the new-game flow note — §1, §2, §4, §5, §6, §29,
  §33, and the draft lifecycle §3.5/§12/§13/§14, and §19/§20. Where it is about *there being one
  manager*, the anchor is `CONTEXT.md` § Manager Profile — the slot model §3.1/§3.2/§7/§8/§15/§18,
  the slot-keyed state and command vocabulary §24/§25/§26, and the list-shaped accessibility and
  keyboard requirements §30.1/§30.3/§30.5/§31.
- **Non-normative scaffolding** (§39, §40, §41, `Suggested Git commit`) `out-of-scope`, matching
  every other screen in the ledger.

§30.2 and §30.4 are the one place the accessibility requirements survive: ticket 01's confirmation
opens focus on the safe choice and restores it on dismissal, which is what those clauses ask for.
Splitting §30 rather than disposing of it whole is the difference between "there is no list" and
"accessibility does not apply here", and only the first is true.

### Two conventions bent, both recorded in the ledger itself

- **`renamed`'s Anchor.** The ledger defines it as holding a `CONTEXT.md` term. §21 and §22 hold
  effort tickets instead, because the concept was not renamed but *relocated*, and the decision that
  carries it is the ticket that shipped it. There is no domain word for "the confirmation you get
  when you leave creation", and minting one to satisfy the column would put a term in `CONTEXT.md`
  that nothing else uses. The preamble says this rather than leaving a reader to notice.
- **The import edit.** §6.4 Primary actions had `Invite Network Manager` and `Multiplayer Settings`
  removed, against a preamble saying import files are never edited. Recorded, not reverted. Worth
  noting because it is *partial*: §5's ASCII layout still draws `[Invite Network Manager]` and §40's
  brief still lists both, so the file now disagrees with itself — which is the clearest argument for
  the convention it broke.

The new-game flow note is still `proposed`, as it was when ticket 16 wrote the original section. The
rows anchor to it as the decision of record and say so, rather than treating its lifecycle as a
reason to withhold the disposition.
