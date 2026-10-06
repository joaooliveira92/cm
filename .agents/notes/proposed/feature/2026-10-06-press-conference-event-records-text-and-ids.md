# Agent Note: The press conference event records text and ids

Status: proposed

## Problem

An answered [post-match press conference](2026-10-06-post-match-press-conference-enters-v1.md) is
written as one event on the match's stream and read back as a News Message. The event can store
template and answer ids, the rendered question and answer text, or both. That decides whether past
transcripts change when the catalogue's copy changes, and what a future consequence model can read.
The command that writes the event also needs a contract.

## Proposal

**Content.** For each exchange the event stores the question's template id, the rendered question
text, the chosen tone id (Positive, Measured, or Combative), and the rendered answer text. The News
Message renders from the stored text only, so editing or deleting a template never changes a past
transcript. The ids exist for a later consequence model and are not read by any v1 surface.

**Command.** One new command writes the whole conference, sent once when the manager answers the last
question. Nothing is written per answer, so a conference abandoned partway records nothing, the
same as a skip. The main process:

- refuses a match that is not the manager's accepted Fixture;
- refuses a match that already has a conference recorded;
- re-derives the questions from the match record and refuses a submission whose questions differ, so
  the renderer cannot record questions the match did not produce.

## Alternatives considered

- **Ids only.** Rejected: an edit to the catalogue would rewrite every past transcript, and a deleted
  template would leave a hole in history.
- **Rendered text only.** Rejected: a consequence model would have to parse prose to learn what was
  asked and in what tone.
- **One event per answer.** Rejected: a half-finished conference would leave partial records, which
  contradicts "a skip writes nothing".
- **Trusting the renderer's questions.** Rejected: the event log is authoritative, and questions the
  match did not produce must not enter it.

## Acceptance criteria

- One event per answered conference, holding two to four exchanges.
- A transcript reads the same after the catalogue's copy for its templates changes.
- A second submission for the same match is refused and writes nothing.
- A submission whose questions differ from the re-derived ones is refused and writes nothing.

## Risks

- **Duplicate storage**: the text and the ids could disagree if a bug renders the wrong text. The
  re-derivation check at write time is the guard.
