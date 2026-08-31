# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **[CONTEXT.md](../../CONTEXT.md)** at the repo root, or
- **`CONTEXT-MAP.md`** at the repo root if it exists: it points at one [CONTEXT.md](../../CONTEXT.md) per context. Read each one relevant to the topic.
- **[.agents/notes/](../../.agents/notes/)**: read the Agent Notes that touch the area you're about to work in, starting with `implemented/` and `proposed/`. See [notes.md](notes.md) for the lifecycle and class layout.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill creates `CONTEXT.md` lazily when terms actually get resolved, and `cm-wayfinder` / `cm-implement` write notes when decisions actually get made.

## There is no `docs/adr/` in this repo

This repo has no ADR layer. It once had twelve numbered records under `docs/adr/`; they were retired and migrated into Agent Notes under `.agents/notes/implemented/`, and the directory was removed. **Agent Notes are the sole decision record.**

Do not create `docs/adr/`, and do not offer to write an ADR. A decision that would have been an ADR — repo-wide, durable, structural — is an `architecture`-class note; see the routing rule in [the post-handoff classification note](../../.agents/notes/implemented/process/2026-08-27-classifying-post-handoff-decisions.md).

You will still find `ADR-0001` … `ADR-0012` cited in source comments and in older notes and reports. Those are historical identifiers for decisions that now live in notes; the mapping is the Decision-record column of [.ai/TRACEABILITY.md](../../.ai/TRACEABILITY.md). Treat such a citation as a pointer to the corresponding note, not as evidence that an ADR file exists.

## File structure

Single-context repo (this repo):

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

Multi-context repo (presence of `CONTEXT-MAP.md` at the root): one `CONTEXT.md` per context, with notes still centralized under `.agents/notes/`.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in [CONTEXT.md](../../CONTEXT.md). Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag decision conflicts

If your output contradicts an existing Agent Note, surface it explicitly rather than silently overriding:

> _Contradicts the fixture-driven calendar note (no day clock), but worth reopening because…_
