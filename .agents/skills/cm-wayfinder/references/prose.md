# cm-* prose rules

The cm-* suite writes prose — Agent Notes, specs, tickets — that a maintainer reads later, with no access to the session that produced it. Two rules govern it all; what each artifact must cover follows.

## Complete propositions

Preserve every factual clause in the passage: the actor and action; the condition, timing, and ordering; the modality (must / may / never); the negative guarantee and exception; the ownership, side effect, failure mode, and consequence. Remove adjectives, repetition, and narration only when every factual clause survives and the result is clearer. A smaller word count is not an improvement. When the source is a conversation, synthesize — never let a clause die between the discussion and the written artifact.

## One home

Every proposition has one home. Keep the contract locally at the point of use; link architecture, rationale, history, and extended examples to their owning document instead of restating them. A derived artifact (a ticket from a spec, a note from a ticket) links its source rather than re-copying the prose, and never re-summarizes an already-cited decision.

## Coverage by what you write

- **Agent Note** (`cm-wayfinder`): the decision, the alternatives and why each lost, the consequences, the verification, and the named coverage gaps — complete enough to stand alone. Proposed notes may speak in the future tense; implemented notes state shipped reality. Neither wears the voice of the session that produced it.
- **Spec** (`cm-to-spec`): the problem and the solution from the user's perspective; an extensive user-story list; one implementation decision per bullet, each linked to its source note verbatim; testing decisions stated as the behavior to observe, not the implementation to mirror.
- **Ticket** (`cm-to-tickets`): the end-to-end behavior from the user's perspective; acceptance criteria an agent can tell done from not-done; its Decisions gist and link copied verbatim from the source note's Answer, never re-summarized.

## Keeps, not transcript

Issue references (`#42`, `TODO(name):`), suppression justifications, and measured bounds are durable fact, not expression. They stay wherever they resolve at HEAD.