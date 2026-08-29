# Inbound-link policy for archived effort paths

Type: grilling
Status: open

Blocked by: None

## Question

Roughly 100 references point into `.scratch/` from outside it — Agent Notes, ADRs,
[docs/roadmap.md](../../../docs/roadmap.md), [docs/architecture.md](../../../docs/architecture.md),
[docs/e2e.md](../../../docs/e2e.md) — and `verify-md-links` is a quality gate, so a move that ignores
them breaks the build.

What happens to each inbound reference when its target moves to `.scratch/archived/<effort>/`?

`cm-archive-notes` faces the same problem for notes and answers it with a judgment call: redirect the
link to current authority, or leave it pointing at the archived path when the historical snapshot is
the intentional citation. Does that transfer wholesale, or do efforts differ?

The hard cases are the ones where an archived file is still cited as *live* authority rather than as
history: `docs/architecture.md` cites `cm-clone/spec.md` for current system behavior, and
`docs/e2e.md` calls `.scratch/e2e-coverage/spec.md` its source. Repathing those keeps the gate green
but leaves current-behavior documentation pointing into an archive.

Also: are these references rewritten mechanically (a path substitution the skill performs), or
reviewed one at a time? And do plain string citations in prose — not Markdown links, so invisible to
the gate — get the same treatment?
