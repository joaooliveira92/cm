# Leaked reasoning transcripts

Calibration for trimming prose whose vantage is the authoring session rather than the repository. Every hit needs judgment — the batteries over-match by design, and they under-match by nature: pair them with an unpatterned read of the densest prose in scope.

## The one test

Could a reader at HEAD, with no session transcript, PR thread, or uncommitted draft, resolve every reference and verify every claim? If no, restate the surviving facts from the repository's vantage and delete the rest. If yes, it is not leakage — but on current-state surfaces (READMEs, docs, notes) a resolvable change-story is still change narration, and class 3 below owns where it may live.

## Taxonomy

1. **Dead design-session citations** — `(decision N)`, audit item codes, plan/draft `§N`, phase labels. If the decision has a committed owner, cite it by name and path; otherwise delete the citation and restate its factual clause to stand alone.
2. **Stack and PR vantage** — "a later PR in this stack", "this PR adds", "the previous commit". State the shipped mechanism or extension point; deferred work moves to a TODO or an issue.
3. **Change narration and version stamps** — "used to", "no longer", "the old X"; indexical stamps ("v1", "this cut", "today"). State the present behavior; a fixed regression becomes a present-tense counterfactual ("without X, Y happens"), never repo history.
4. **Review choreography** — "Rejected in review:", "the reviewer confirmed", draft ordinals ("v5 of this note"), round attributions. Keep the surviving decision and rationale as plain fact; delete who said it when.
5. **Reviewer-addressed justification** — "the cast is safe — it simply…", "this is correct because…". State the invariant that makes it safe, or delete the comment if the code shows it.
6. **Restatement and derivation** — control-flow narration, test walkthroughs. Delete; keep only a non-obvious contract or invariant.
7. **Hedges and planning residue** — "probably fine for now", "should be enough", deferrals with no marker. Promote to TODO/FIXME or state the actual bound; delete the hedge.
8. **Working-language slips** — untranslated working-language fragments, session separators. Translate or delete.

## Keeps — not leakage

- **Issue references** — `#42`, `TODO(name):`, "issue #N owns the follow-up": resolve at HEAD on any surface. Do not relocate them to notes.
- **Merged-PR and issue citations inside notes and postmortems** — sanctioned evidence.
- **Suppression justifications** — lint-disable reasons, coverage-ignore reasons, empty-catch explanations are required prose; fix a false reason, never delete it.
- **Counterfactual present regression pins** — "without X, Y happens", "a naive X would…".
- **Measured bounds** — the provenance word "measured" is load-bearing.
- **Runtime old/new** — "the old connection drains before the new one accepts" is lifecycle, not history.
- **Project voice and genre** — "we" as project voice; a note's Alternatives-considered section.
- **External references** — standards sections (RFC 9110 §10.1.5), Figma frame names: they resolve outside the repo by design.

## Overcorrection traps — enumerate a passage's propositions before trimming

- **Flipping an obligation into an endorsement** — "exceptions *pending migration*" must not become "*sanctioned* exceptions".
- **Promoting a hypothetical to a shipped feature** — keep the future-marker: "a hypothetical IPC shell … would subclass", never plain "an IPC shell subclasses".
- **Deleting a true fact with the transcript around it** — half a sentence may be narration, the other half load-bearing; cut clauses, not sentences.
- **Dropping provenance while keeping the number** — "measured" is the distinction between an observation and a definition.

## Recall batteries

Run with `--hidden` so `.agents/` is searched (ripgrep skips dot-directories by default); put exclusions last so a later include cannot re-admit them (`--glob '!vendor/**' --glob '!node_modules/**' --glob '!.agents/notes/archived/**'`), plus the skill's own directory and recorded fixtures/snapshots when in scope. Natural-language lines carry `-i` so sentence-initial capitals hit; a zero-hit pattern proves nothing until it has matched a known positive. Known false positives: instrumental "used to" ("the key used to sign requests"), `/v1/` as an API path, RFC `§N`, project-voice "we", recorded output.

```sh
rg -n --hidden '\(decision \d|\(audit [A-Z]\d|design §|plan §|design ledger|\(B ruling|\bP-I\b|\bW\d\b|\bT\d\b'
rg -n --hidden -i 'this PR|this branch|this stack|later PR|previous commit|this commit'
rg -n --hidden -i 'used to |no longer|previously|the old |was renamed|was moved'
rg -n --hidden -i '\bv1\b|this cut|\bcut \d|\btoday\b|\bfor now\b|roadmap'
rg -n --hidden -i 'rejected in review|review round|reviewer|as of v\d'
rg -n --hidden -i 'probably |should be enough|should suffice|it simply|is safe —|is safe --'
rg -n --hidden '§\d'
```