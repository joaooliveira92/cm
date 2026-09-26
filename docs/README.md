# Documentation

Start here. `docs/` holds human-facing prose; the decision record lives in
[.agents/notes/](../.agents/notes/) and open work lives in [.scratch/](../.scratch/).

## Contributor guides

| Doc | What it covers |
|---|---|
| [architecture.md](architecture.md) | The monorepo's shape: packages, the RPC seam, event sourcing, where logic is allowed to live. |
| [development.md](development.md) | Setup tutorial, then daily workflow, repository layout and CI. |
| [e2e.md](e2e.md) | The Playwright + Electron end-to-end suites and how to run them. |
| [roadmap.md](roadmap.md) | Point-in-time snapshot of where efforts stand. Read by `scripts/resolve-ticket.ts`, so this path is load-bearing. |

## Domain and design reference

The game is a Championship Manager 03/04 clone, so much of the design work is archaeology of the
original. [CONTEXT.md](../CONTEXT.md) is the game-domain glossary; the files below are the UI and
onboarding reference that sits alongside it.

| Doc | What it covers |
|---|---|
| [design/ui-elements.md](design/ui-elements.md) | Catalogue of CM 03/04 interface elements. The reference the renderer is measured against. |
| [design/game-onboarding.md](design/game-onboarding.md) | How the original onboarded players: configure the world, then straight into the job. |
| [design/inbox-system.md](design/inbox-system.md) | The inbox and news system read as the game's real onboarding surface. |
| [design/redesigned-navbar.md](design/redesigned-navbar.md) | Implementation guide for the redesigned global navigation. |

## Specifications

[specs/](specs/) holds one file per screen, grouped A-S, indexed by
[specs/manifest.md](specs/manifest.md). Groups are lettered by area (A application shell,
G match day, J transfers, S search and reference); screens are numbered 1-277 across the
whole set, so a screen number identifies a spec uniquely regardless of its group.

Group G's files are zero-padded (`091_` through `104_`) while every other group is unpadded
(`33_`, `250_`). That is deliberate, not drift: G is the only group spanning the 99-to-100
boundary, and without the padding `100_` sorts before `91_`. Leave it alone.

## Research

[research/](research/) is the output directory for research subagents, one file per
`<effort>-<topic>`. The path is mandated by [.ai/ORCHESTRATION.md](../.ai/ORCHESTRATION.md).

## Conventions for agents

[agents/](agents/) documents the working conventions that [AGENTS.md](../AGENTS.md) summarises:
the [issue tracker](agents/issue-tracker.md), [triage labels](agents/triage-labels.md),
[Agent Notes](agents/notes.md), [domain docs](agents/domain.md), the
[cm-* skill suite](agents/cm-skills.md), [domain skills](agents/domain-skills.md), and
[unslop.md](agents/unslop.md) for prose style.
