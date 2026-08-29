# Landing checklist

`cm-implement` ends at "commit". Use these rules when the work reaches a branch or PR: select the smallest evidence that covers the outgoing diff, then land and verify. Applies to both a standalone PR and a PR stack.

## Select relevant local checks

There is no universal local baseline. Every behavior change needs the narrowest available test or check that would fail for its regression; add broader checks only for surfaces the diff actually reaches:

- **Package or script behavior:** the owning test file or focused test name. Add adjacent tests when a shared contract changes; leave repository-wide coverage to CI unless the change is genuinely cross-cutting.
- **Docs, notes, catalogs, or doc-linked comments:** the gate that owns the changed surface.
- **Model-, editor-, CLI-, or terminal-visible output:** the focused snapshot or real runnable-example scenario that owns the output.
- **Manifests, public exports, build configuration, worker/bin entries:** the build, the relevant hygiene checks, and the owning built-artifact smoke.
- **Real provider or agent behavior:** the relevant e2e target when credentials are available — never print secrets.

Do not repeat a passing check manually merely because commit or push follows. Run the full local approximation only when the user requests it, while diagnosing a CI failure, or when the change spans the repository so broadly that no narrower set is credible.

## Protect history-rewriting pushes

Before a standalone history rewrite, fetch the current remote branch and record its exact OID; publish with `--force-with-lease=<branch>:<observed-oid>` so a concurrent update aborts the push. `gh stack push` and `gh stack sync` supply lease protection for their managed branches. Raw `--force` is never allowed.

After any rewritten push, fetch the live heads again and re-audit unresolved review threads, approvals, mergeability, and checks — commit hashes and inline-comment anchors from before the rewrite are not current evidence.

## Landing a PR stack

Require GitHub's native stack support (`gh stack --version`) and every head branch in the same repository before changing GitHub state. Verify stack membership and bottom-to-top order from live PR bases and the official `stack` object — `PullRequest.stack`, not base-branch inference alone — before mutating anything. Never reproduce stack semantics by merging and retargeting individual PRs with `gh pr merge` and `gh pr edit`.

When dependent PRs are not yet in the official stack: compare authors exactly; if all match, link them in bottom-to-top order with `gh stack link --base <trunk> <bottom> <next> … <top>`; if authors differ, ask the user before changing GitHub state. Never dissolve, reorder, or rebuild an existing stack automatically — `gh stack link` is additive.

Refreshing the stack after its base moves: prefer the native cascading rebase (`gh stack sync`), inspect every rewritten layer, and do not merge or claim readiness until its checks pass. Choosing the incremental merge-forward history is allowed only when the repository rules require it; either way, re-fetch exact heads and re-audit after the rewrite.

**Preflight immediately before merging:** every selected PR open, non-draft, in the expected order, and compliant with the repository's review and check requirements. A ready top layer does not prove its dependencies are ready.

**Merge through the stack API**, never per-PR:

```sh
gh stack merge <stack-number> --yes --merge
```

For a partial landing, merge through the explicit boundary PR. A direct stack merge is all-or-nothing; GitHub merges the range bottom-up and retargets any remaining upper layers. Never pass `--delete-branch`, never manually retarget dependents, and never bypass merge requirements by falling back to `gh pr merge` — resolve a reported blocker through the owning PR or stop and report it.

## Verify the landed state

Wait for every selected PR to report `MERGED` — a queued request is not a completed landing:

```sh
gh pr view <pr> --json number,state,mergedAt,mergeCommit
```

For a partial landing, re-query the official stack and verify every remaining PR is still linked in the expected order; GitHub may have rebased the remaining layers, so re-check heads, review state, and CI.

Delete branches only in a separate final pass, after the corresponding PRs report `MERGED`, and only when no open PR still uses the branch as a base:

```sh
gh pr list --state open --base <branch> --json number --jq length
```

Anything other than `0` blocks deletion. Never delete or rewrite a long-lived or assets branch.