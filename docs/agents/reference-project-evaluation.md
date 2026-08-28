# reference-project evaluation

Evaluation of [reference-project/](../../reference-project/), an untracked directory containing an extracted skill/documentation system, in the same style as the [wayfinder evaluation](wayfinder-evaluation.md).

## What it is

`reference-project` is a partial extraction of two things from a repo internally called **deepseek-harness** (the `dsh-` skill prefix): an **Agent Notes** system — RFC-style decision records — and nine `dsh-*` skills (plus one unrelated `record-browser-gif` skill) that operate on that repo's specific tooling.

**Agent Notes** ([notes/README.md](../../reference-project/notes/README.md)) are decision records with two axes encoded in their path — `{lifecycle}/{class}/yyyy-mm-dd-topic.md`:
- **Lifecycle**: `proposed/` → `implemented/` → (optionally) `rejected/` or `archived/`, each with a distinct required section skeleton (`## Proposal`/`## Acceptance criteria` for proposed; `## Decision`/`## Consequences` for implemented — proposal-speak is explicitly banned once implemented).
- **Class**: a closed set (`feature`, `bug-fix`, `simplification`, `architecture`, `process`, `testing`) enforced by `scripts/agent-note-tree.ts`.

Rules are strict and tooling-backed: every non-trivial change must add/update a note in the same PR; a mandatory `## Alternatives considered` section; archival freezes a note (English + Chinese + sidecar triplet) with a hash-pinned manifest so sealed content can never silently drift; a supersession check runs on every new note to catch and archive anything it replaces.

**The `dsh-*` skills** are the operational layer on top: [dsh-archive-agent-notes](../../reference-project/skills/dsh-archive-agent-notes/SKILL.md) (archival judgment), [dsh-code-review](../../reference-project/skills/dsh-code-review/SKILL.md), [dsh-doc-standards](../../reference-project/skills/dsh-doc-standards/SKILL.md) and [dsh-prose-standard](../../reference-project/skills/dsh-prose-standard/SKILL.md) (placement vs. editorial judgment, split deliberately), [dsh-trim-cot-leakage](../../reference-project/skills/dsh-trim-cot-leakage/SKILL.md) (hunts prose that reads like a leaked reasoning transcript — dead citations like "(decision N)", "this cut", reviewer-addressed justifications), [dsh-doc-site-sync](../../reference-project/skills/dsh-doc-site-sync/SKILL.md) (VitePress projection), [dsh-merging-stacked-prs](../../reference-project/skills/dsh-merging-stacked-prs/SKILL.md) (GitHub's native stacked-PR feature), [dsh-pre-push-checks](../../reference-project/skills/dsh-pre-push-checks/SKILL.md), and [dsh-translate-docs](../../reference-project/skills/dsh-translate-docs/SKILL.md) (bilingual EN/ZH pairing).

## State of this checkout: tooling present, decision corpus absent

The directory now includes [scripts/](../../reference-project/scripts/) alongside `.agents/notes/` and `.agents/skills/` (the notes and skills folders were corrected to live under `.agents/`, matching the path the gate scripts themselves expect — [agent-note-tree.ts:9](../../reference-project/scripts/agent-note-tree.ts) resolves the note root as `../.agents/notes` relative to `scripts/`). This changes the picture from the first pass: the enforcement machinery is **real, not aspirational**.

- `scripts/` has ~170 files. The Agent Notes gates are genuinely implemented and each carries a paired spec: [agent-note-tree.ts](../../reference-project/scripts/agent-note-tree.ts) (83 lines — the shared closed-lifecycle/closed-class walker), [verify-agent-note-format.ts](../../reference-project/scripts/verify-agent-note-format.ts) (94 lines), [verify-archived-agent-notes.ts](../../reference-project/scripts/verify-archived-agent-notes.ts) (115 lines, `.spec.ts` sibling), plus `verify-agent-note-classification.ts`, `verify-translation-pairing.ts`, `verify-doc-refs.ts`, `verify-doc-budgets.ts`, `verify-doc-site-fragments.ts`, `translation-pairing.ts`. [run-gates.ts](../../reference-project/scripts/run-gates.ts) is a 968-line orchestrator wiring these (and dozens of unrelated build/release/SDK gates — Linux/Windows CI variants, coverage partitioning, Python-SDK packaging) into named aggregates (`ci-primary`, `doc-sync`, `hygiene`, etc.). This is a mature, tested CI gate graph, not sketch code.
- The bulk of `scripts/` (release pipeline, Python-SDK build/packaging, `cordis-*` config generation, client bundle/domain-graph verification, oxlint contract, vendor rescoping) belongs to the wider **deepseek-harness** product, not to the Agent Notes system specifically — the extraction pulled the whole engineering `scripts/` tree, confirming this is a full CLI/SDK harness project (Python + TypeScript SDKs, a web client, its own doc site) rather than a small repo.
- Still absent: `.git`, `package.json`/lockfile, `docs/` (so `docs/AGENTS.md` and `docs/i18n/README.md`, both cited as authorities, aren't present), and any actual source under packages/apps. The gates can't literally execute here — there's no install, no `docs/` tree for `verify-doc-refs`/`verify-doc-budgets` to walk.
- `.agents/notes/{proposed,implemented,rejected}/` still contain **zero actual notes** — only `AGENTS.md`/`README.md`/`.DS_Store`. `.agents/notes/archived/manifest.json` still lists **429 entries (143 archived triplets)** of real decision history (e.g. `architecture/2026-06-11-custom-schema-dsl.md`) whose `.md`/`.zh.md`/`.i18n.yaml` files are all absent — the manifest is the one surviving trace of the actual decision corpus.

Net effect on the evaluation: the **enforcement layer** (scripts + gates) is a legitimate, working reference — worth reading as an implementation example, not just prose. The **decision corpus** (the notes themselves, which is what the system produces and what "adoption" would look like) is still entirely absent, and the rest of the product (source, `docs/`, package manifest) never came along. So there's still no "how well is this used" question to answer the way there was for wayfinder — but the design can now be checked against a real, tested implementation rather than taken on faith from the skill prose.

## Design evaluation (judged as a spec, not as observed practice)

**Strengths:**
- The closed class taxonomy plus a tooling gate (not just convention) that rejects wrong-lifecycle section headers is a real defense against decision-record rot — most ADR systems have no equivalent enforcement.
- Separating "sealed and frozen" (`archived/`, hash-manifest-pinned, never edited again) from "active and must stay current" (`implemented/`, kept in sync with the code in the same PR that changes it) solves a problem this repo's own `docs/adr/` doesn't address: ADRs here are static once written, with no mechanism keeping them honest as code moves.
- The mandatory supersession check on every new note is a sharper version of what `/domain-modeling` in this repo does informally.
- `dsh-trim-cot-leakage` names and treats a real, specific failure mode — agent-authored prose that argues with a reviewer who's left, or cites "(decision N)" from a session no reader can see — that's genuinely worth adopting independent of everything else here.

**Weaknesses / risks:**
- Heavy ceremony: mandatory note-per-PR, mandatory Alternatives-considered, bilingual pairing, hash manifests — this is process built for a large team on a long-lived repo (429 manifest entries imply a very active decision corpus), not something to lift wholesale into a smaller project.
- Tightly coupled to deepseek-harness's specific tooling (pnpm scripts, `gh stack`, VitePress, i18n pairing). Contrast with wayfinder, which is deliberately tracker-agnostic via a config file read at runtime ([setup-matt-pocock-skills](../../.agents/skills/setup-matt-pocock-skills/SKILL.md)) — nothing here plays that role; every skill hardcodes repo-specific paths and commands.
- Nine skills cross-reference each other and non-existent files extensively; none is runnable standalone in this checkout, and reconstructing the missing scripts would be substantial work before any of it could function here.

## Relative to this repo

None of this is wired into `audit` — not referenced from [AGENTS.md](../../AGENTS.md), and this repo's `docs/adr/` already covers the "why" that Agent Notes cover, just without lifecycle folders, classification, or archival tooling.

**Worth stealing, not adopting wholesale:**
1. The CoT-leakage failure mode and fix pattern from `dsh-trim-cot-leakage` — applicable to any repo where agents write docs/comments/ADRs, independent of the rest of this system.
2. The archived-vs-implemented split and mandatory-supersession-check discipline could sharpen this repo's ADR practice (e.g. flag when a new ADR should supersede an old one) without importing the full lifecycle/classification/hash-manifest machinery, which only pays for itself at deepseek-harness's scale.

**Not recommended:** porting the Agent Notes system or the `dsh-*` skills as-is — they assume tooling (gates, i18n pairing, a docs site) this repo doesn't have and doesn't need at its current size.
