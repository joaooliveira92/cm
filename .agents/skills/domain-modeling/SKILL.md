---
name: domain-modeling
description: Build and sharpen a project's domain model. Use when discussing codebase terminology, writing or editing a CONTEXT.md, or recording a durable design decision.
---

# Domain Modeling

Actively build and sharpen the project's domain model as you design. This is the *active* discipline: challenging terms, inventing edge-case scenarios, and writing the glossary and decisions down the moment they crystallise. (Merely *reading* `CONTEXT.md` for vocabulary is not this skill: that's a one-line habit any skill can do. This skill is for when you're changing the model, not just consuming it.)

## File structure

<!-- repo-fork: this repo has no `docs/adr/`. Decisions are Agent Notes under `.agents/notes/`.
     Diverges from upstream mattpocock/skills; see docs/agents/domain.md. -->

Most repos have a single context:

```
/
├── CONTEXT.md
├── .agents/notes/
│   ├── proposed/{feature,bug-fix,simplification,architecture,process,testing}/
│   ├── implemented/…
│   ├── rejected/…
│   └── archived/…
└── src/
```

If a `CONTEXT-MAP.md` exists at the root, the repo has multiple contexts. The map points to where each one lives, and each context gets its own glossary:

```
/
├── CONTEXT-MAP.md
├── .agents/notes/                     ← decisions, whatever context they belong to
└── src/
    ├── ordering/
    │   └── CONTEXT.md
    └── billing/
        └── CONTEXT.md
```

Create files lazily: only when you have something to write. If no `CONTEXT.md` exists, create one when the first term is resolved.

**This repo has no ADR layer.** It had one — twelve numbered records under `docs/adr/` — and retired it; the records were migrated into `.agents/notes/implemented/` and the directory removed. Do not create `docs/adr/`, and do not offer to write an ADR.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with the existing language in `CONTEXT.md`, call it out immediately. "Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When the user uses vague or overloaded terms, propose a precise canonical term. "You're saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

When domain relationships are being discussed, stress-test them with specific scenarios. Invent scenarios that probe edge cases and force the user to be precise about the boundaries between concepts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. If you find a contradiction, surface it: "Your code cancels entire Orders, but you just said partial cancellation is possible. Which is right?"

### Update CONTEXT.md inline

When a term is resolved, update `CONTEXT.md` right there. Don't batch these up: capture them as they happen. Use the format in [CONTEXT-FORMAT.md](./CONTEXT-FORMAT.md).

`CONTEXT.md` should be totally devoid of implementation details. Do not treat `CONTEXT.md` as a spec, a scratch pad, or a repository for implementation decisions. It is a glossary and nothing else.

### Offer decision records sparingly

Only offer to write an Agent Note when all three are true:

1. **Hard to reverse**: the cost of changing your mind later is meaningful
2. **Surprising without context**: a future reader will wonder "why did they do it this way?"
3. **The result of a real trade-off**: there were genuine alternatives and you picked one for specific reasons

If any of the three is missing, skip the note. Use the format and the lifecycle/class layout in [notes.md](../../../docs/agents/notes.md). A decision that would once have been an ADR — repo-wide, durable, structural — is an `architecture`-class note.
