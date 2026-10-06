# Decision Request: Is an offered wage a figure or a band the manager picks inside?

Written 2026-09-26 by the orchestrator, raised by [ticket 09](issues/09-player-contract-offer-reads-by-scouting-progress.md)
during review. Ticket 09 is shipped and reviewed; this question is about the rule it had to pick, not
about whether it was built correctly.

## Question

When the manager offers a Contract to a Player he has not Fully Scouted, is the wage a **single figure
the game computes** and the manager merely confirms, or a **range his knowledge supports** and he
chooses a point within?

## Why this is blocking

Three documents say the first, and ticket 09 shipped the second.

- [CONTEXT.md](../../CONTEXT.md) (Contract): "a wage (Credits/season, formula-derived — see Transfer
  Value) and a length of 1–5 years". Nothing there is chosen by the manager.
- [ADR-0005](../../.agents/notes/implemented/architecture/2026-08-27-formula-driven-transfer-economy.md)
  is explicit: "Wages are pure formula output … Offered and accepted as-is, with **no negotiation UI**".
- CONTEXT.md (Attribute Range) lists what a range is for: "a hidden Attribute, Potential Ability,
  Injury Proneness, or Transfer Value". **Wage is not among them, and neither is Overall Rating** —
  though [the 2026-09-19 knowledge note](../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md)
  added Overall Rating and Transfer Value to that set without amending the glossary entry.

The knowledge note overturned ADR-0005's *premise* — that wages follow from full-information Attributes,
which a rival Player's are not. It never re-decided the *consequence*, and the note is silent on wage.
Ticket 09 had to pick something, picked the band, and the band is now a shipped, tested, player-visible
rule with no decision record behind it.

What breaks if it is left: the next reader of ADR-0005 either deletes the band as an undocumented
negotiation UI, or ignores ADR-0005's wage clause. Both are wrong, and one of them is a code change
made from a stale reading of a superseded premise.

## What is already settled

- [ADR-0005](../../.agents/notes/implemented/architecture/2026-08-27-formula-driven-transfer-economy.md)
  — wages are formula output, no negotiation UI. Its premise is overturned; its wage clause is not
  re-decided.
- [The knowledge note](../../.agents/notes/implemented/architecture/2026-09-19-knowledge-limits-every-player-read.md)
  — a Player outside the manager's club reads as ranges by Scouting Progress, exact at Fully Scouted,
  and the limit lives in the read so surfaces cannot disagree. Settled, and implemented by group-i
  09/10/11/12 and group-j 09.
- [Decision request 01](decision-request-01-when-a-contract-can-be-renewed.md) — a Contract's terms are
  set at signing or renewal and never renegotiated mid-term. **Its answer explicitly deferred Screens
  137–139 on that clause**, so a wage the manager negotiates is in tension with it too.
- CONTEXT.md: Contract (wage, 1–5 years), Free Agent, Attribute Range, Fully Scouted.

## Options

### Option A — Keep the band, supersede ADR-0005's wage clause in writing

- **What the player experiences**: below Fully Scouted the manager offers any whole number of Credits
  the published range supports, and the offer is refused outside it; at Fully Scouted there is one wage
  and no choice. This is what shipped.
- **What it costs to build**: nothing in code. ADR-0005 gains a superseding note on its wage clause,
  CONTEXT.md's Contract entry names the wage as a knowledge-bounded term rather than a pure formula
  output, and Attribute Range gains wage and Overall Rating.
- **What it forecloses**: the wage stops being a pure function of Attributes, which is the property
  ADR-0005 existed to guarantee. Anything that later wants "the wage a Player is worth" must ask the
  band, not the formula.
- **Save compatibility**: none.

### Option B — The wage stays formula-derived; below Fully Scouted the manager confirms a range

- **What the player experiences**: the published figure or range is informational; the wage the Contract
  carries is the formula figure, exactly as ADR-0005 says, and the terms UI drops its wage input.
- **What it costs to build**: the band leaves `wageFigureByProgress`/`wageIsWithinFigure`, the wage input
  and its gate, and the e2e case that drives the gate. The offer keeps Role and length, which are the
  parts of AC3 that ADR-0005 does not forbid. A player-visible reduction from what shipped.
- **What it forecloses**: an unscouted signing is a slight nonsense — the manager agrees to a number he
  has not earned knowledge of, and the range on screen has no bearing on the result.
- **Save compatibility**: none.

### Option C — Record-only: wages are formula-derived *and* the offer shows what it will be

- **What the player experiences**: as Option B, but the figure is stated as the outcome rather than as
  an input.
- **What it costs to build**: as Option B.
- **What it forecloses**: same as B, with more copy.
- **Save compatibility**: none.

## Recommendation

Option A, and the reason is that the knowledge note has already moved the world past ADR-0005's
premise. A wage computed from Attributes the manager has never seen is the same defect the note was
written to remove, in the one place the glossary did not think to look: ADR-0005's answer to "what is
this Player worth?" is a function of data, and below Fully Scouted there is no such data. The band is
the smallest honest extension of a rule that is already binding, and the gate refusing an
out-of-knowledge wage is what stops the manager buying on numbers he does not have.

Choose B if the formula is the more important property — it is a legitimate answer, and the fix is to
delete a shipped feature rather than to document one.

**Role is the smaller half of the same question.** Ticket 09 makes Role a term of the offer, which
CONTEXT.md's Contract entry does not list (it names a wage and a length). Option A should amend that
entry either way, since the Role now exists in the UI, in the command, and in the `PlayerSigned` event.

## What is blocked, and what is not

- **Blocked**: nothing in the queue. Ticket 09 is shipped and gated under the band as it stands, and
  this request does not reopen it. What is blocked is *amending the prose* — ADR-0005, the two
  CONTEXT.md entries, and any later ticket that wants to rely on "the wage is the formula figure".
- **Proceeding meanwhile**: everything else. In particular the band's shape is not frozen by this
  request: a later ticket may narrow the range, and Option A does not forbid that.
- **Related, and also unresolved**: whether the signed Role is persisted. It rides the `PlayerSigned`
  event payload and no projection stores it, because persisting it needs a `contracts.role` column and
  this repo has no save migration path at all
  ([ticket 32](../group-g-match-day/issues/32-saves-need-a-migration-path.md), answered *disposable
  during development*). Until that resolves, the first screen to need a signed Player's Role will have
  to add the column and the migration together.
