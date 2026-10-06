# Agent Note: The press conference question catalogue

Status: proposed

## Problem

The [post-match press conference](2026-10-06-post-match-press-conference-enters-v1.md) asks two to
four deterministic, templated questions, each answered in one of three tones. That leaves open
which match facts trigger questions, how two to four are chosen when more qualify, what the three
tones are, how much variety the copy carries, and where the catalogue lives.
[The research note](../../../../docs/research/post-match-press-conference-questions.md) found eight
trigger groups and twelve answer registers in real conferences.

## Proposal

**Seven trigger groups**, all detectable from a recorded match and the League table:

1. Result and margin.
2. Late or decisive goal.
3. Scorer milestone: two goals, a hat-trick, or a player's first goal for the club.
4. Dismissal, of either side's player.
5. Injury.
6. League position and form.
7. Opponent standing.

Refereeing decisions are not a group of their own. The engine models no referee, so the only
refereeing facts a match records are penalties and dismissals; refereeing questions exist as
variants inside groups 2 and 4. A player's debut is not a trigger.

**Selection**, following the order real conferences run in:

1. Exactly one opening question from group 1, always.
2. Then up to two incident questions, from groups 4, 5, 2 and 3 in that priority order, at most one
   per group.
3. Then one closing question from group 6 or 7, only when it is notable: the manager's club entered
   or left the top or bottom places, or the result extends a run of three or more alike.

A conference therefore holds two to four questions. The match seed chooses between variants within
a group, never between groups, so which groups appear is a pure function of what happened.

**Three tones on every question**: Positive (praise or credit), Measured (deflection or looking
ahead), Combative (criticism or defiance). Each template supplies its own answer text for all three;
the tone id is the same across every template. The answer controls show the text, not the tone name.

**Variety**: three question phrasings per template, one answer phrasing per tone per template,
roughly fifteen to twenty templates across the seven groups.

**Storage**: a typed table in code, in the manner of the News copy table, not a player-editable
file.

## Alternatives considered

- **All eight research groups, refereeing included.** Rejected: there is no referee to ask about;
  the facts that exist are covered inside groups 2 and 4.
- **Debut as a trigger.** Deferred: it needs a player's whole appearance history read at commit
  time, for a rare question.
- **A fixed question count.** Rejected: a quiet draw and a seven-goal match with a red card should
  not draw the same number of questions.
- **Tones chosen per template from the twelve registers.** Rejected: a varying tone vocabulary gives a
  future consequence model nothing stable to read.
- **A player-editable file like the [Commentary File](../../implemented/architecture/2026-08-27-templated-match-commentary.md).**
  Deferred: parsing, fallback to the shipped copy, a Preferences surface, and format documentation
  are too much for flavour text. The recorded event stores rendered text (see
  [the event note](2026-10-06-press-conference-event-records-text-and-ids.md)), so moving to a file
  later cannot rewrite past transcripts.

## Acceptance criteria

- Every conference opens with a result question and holds two to four questions.
- A match with no dismissal, injury, late or decisive goal, or scorer milestone, and nothing notable
  in the table, produces exactly one question plus none or one closer.
- The same match always yields the same questions, phrasings, and answer texts.
- Every question offers exactly three answers, one per tone.

## Risks

- **Repetition** over a long season if the catalogue stays near its minimum; the fix is more copy, not
  structure.
- **"Notable" thresholds** for the closing question are a design choice; they may need tuning once
  played.
