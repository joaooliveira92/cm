# Brief: <effort name>

A brief is the **pre-spec** artifact: what a sprint is for, in enough detail that `cm-to-spec` can
turn it into a spec without inventing intent. Most efforts in this repo skip it — a
`cm-wayfinder` `map.md` plus resolved decision tickets does the same job better. Write one only when
an effort arrives fully formed and goes straight to spec.

Copy this file to `.scratch/<effort>/brief.md`. Delete the guidance lines as you fill it in.

## Goal

One paragraph. What a player can do after this sprint that they cannot do now. Player-facing, not
implementation-facing.

## Why now

What makes this the next thing. Which queued effort it unblocks, or which sharp edge it removes.

## Domain terms

Every [CONTEXT.md](../../CONTEXT.md) term this touches. Flag any concept that needs a **new** term —
that is a `domain-modeling` task before implementation, not a naming decision during it.

## Acceptance criteria

Numbered, observable, each provable by a test. "Feels better" is not a criterion.

1.
2.

## Constraints

The ADRs, Agent Notes, and contract sections that already bind this work. Include anything that has
been decided and must not be relitigated here.

## Out of scope

What this sprint deliberately does not do — so a reduced implementation is not mistaken for a
complete one.

## Open questions

Anything genuinely undecided. If a question would change game behavior depending on the answer, it
is a decision ticket, not a brief line.
