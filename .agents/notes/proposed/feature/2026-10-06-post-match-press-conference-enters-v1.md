# Agent Note: The post-match press conference enters v1, as flavour

Status: proposed

## Problem

On 2026-09-18 the Group M reconciliation kept every media screen out of v1
([ticket 02](../../../../.scratch/group-m-media-press-and-communications/issues/02-v1-scope.md)), resting on
two CONTEXT.md statements: the **Influence** entry lists media handling among systems that do not ship,
and the **Calendar** entry treats the absence of press content as the reason the clock needs no
finer grain. On 2026-10-06 the human asked for the manager to face a panel of journalists about the
match right after accepting its result. The question is how much of the exclusion that reverses and
what the conference is allowed to touch.

## Proposal

Only Screen 182's post-match case enters v1. The other twelve Group M screens — Media Centre,
interviews, pre-match briefings, statements, rumours, outlet and journalist profiles, transcript
history — stay out.

- **When.** Every time the manager accepts the result of their own Fixture, Match day presents the
  press conference automatically. Quick result and a live match behave the same.
- **No consequences.** Answers change no world state: no morale, reputation, board opinion,
  relationship, or any other number. The conference is flavour.
- **Never blocks Continue.** Continue is available the moment the result is accepted. Pressing it
  before the conference is finished skips the conference; there is no separate Skip control and no
  state in which the conference holds Continue disabled.
- **Questions.** Two to four per conference, chosen deterministically by templates from what the
  match recorded (result, margin, scorers, dismissals, injuries, League position, form), seeded from
  the match the way Commentary Templates are. The same save produces the same questions. No generated
  text (no LLM).
- **Answers.** Three per question, each a distinct tone. No free text.
- **Panel.** Anonymous: questions are attributed to generic outlets. No journalist or outlet is
  generated, named, or persisted.
- **Recording.** An answered conference is written as one event on the match's stream, naming the
  questions asked and the answer chosen for each. A skipped conference writes nothing. No new table.
- **Reading back.** The News Inbox derives one News Message from that event, under the existing
  `result` Category. No new Category.
- **Pending state is not durable.** A conference waiting to be answered lives in renderer memory
  beside the committed-match store; closing the app before answering loses it, which is the same
  outcome as skipping.
- **No Pillar binding.** Influence does not read or change the conference. That is consistent with
  [the v1 Pillar bindings](../../implemented/feature/2026-08-29-manager-pillar-bindings-v1.md), which
  cut media handling from Influence; this note does not reverse that cut.

The Calendar is unaffected: the conference happens on the Matchday the Calendar already stops at, so
no clock that stops on non-Fixture dates is introduced.

## Documentation that changes with the first code

Ticket 02's answer requires that CONTEXT.md be amended in the same commit as the first code, not
before. That commit rewrites the **Calendar** entry's "no press content" clause and the **Influence**
entry's "media handling" clause to describe a flavour-only post-match press conference, adds a
**Press Conference** glossary term, and moves Screen 182 in
`docs/specs/group_m_media_press_and_communications/RECONCILIATION.md` from deferred in full to
partially built.

## Alternatives considered

- **Keep the exclusion (ticket 02's Option A).** Rejected by the human on 2026-10-06; the post-match
  conference is wanted.
- **Pre-match and post-match conferences together.** Rejected for now: a pre-match conference is a
  second trigger with its own placement against the Pre-match Boundary and gains nothing a post-match
  one does not already prove.
- **Reopen all of Group M.** Rejected: ticket 02 costed it as a programme needing reputation, morale,
  a consequence decider, balance numbers, and a finer Calendar.
- **Light consequences through existing systems.** Rejected: nothing shipped models morale or
  opinion, so any hook would be an arbitrary number with no model behind it.
- **A new consequence model.** Deferred to its own effort, not rejected. Recorded answers are kept so
  that effort can read history rather than start empty.
- **Mandatory conference, or a separate Skip control with Continue disabled until used.** Rejected: a
  manager who simulates many matches would be forced through every one, and any state that disables
  Continue is a new way for the career to stall.
- **Recording a skip as "the assistant faced the press".** Rejected: it writes events that carry no
  content.
- **Persisting a pending conference across restarts.** Rejected: it makes a flavour feature part of
  the save's pending state, alongside the Pre-match Boundary, for no gameplay gain.
- **Named journalists and outlets.** Deferred: they pay off only once relationships exist.
- **A new `media` News Category.** Deferred: it widens a union declared in three places for one
  message kind; split it out when media grows.
- **Generated (LLM) text.** Rejected: it breaks determinism and offline play.

## Acceptance criteria

- After accepting any own-Fixture result, the press conference is presented on Match day without a
  further click.
- Continue is visible and enabled after Accept whether the conference is unanswered, half-answered,
  or finished; pressing it moves the career on and records nothing for an unfinished conference.
- Replaying the same save to the same match yields the same questions.
- An answered conference survives reload as one News Message in the `result` Category listing each
  question and the chosen answer.
- No world-state value differs between a save that answered and one that skipped.

## Risks

- **Flavour fatigue.** Inert answers may feel pointless; the deferred consequence model is the answer,
  and the recorded events are what it will read.
- **Template staleness.** A small catalogue repeats quickly over a season; catalogue size is decided
  in the catalogue ticket.
- **History drift.** Whether the event stores template ids or rendered text decides whether editing a
  template rewrites past transcripts; settled in its own ticket.
- **Scope creep.** The conference is the obvious hook for morale and reputation. Adding either reopens
  ticket 02's programme and needs its own decision, not an extension of this one.
