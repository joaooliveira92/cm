# 14: `incoming-bids.test.ts` assumes the first window leaves exactly one bid

**What to fix:** "guarantees a fresh bid in a later window, not just the first one"
(`apps/desktop/test/main/transfers/incoming-bids.test.ts`, around :477) asserts
`strictEqual(pendingCount, 1)` after the first `advanceThroughBoundary`. The guarantee pass promises
*at least* one open bid. A random `createSave` world can also produce an organic AI bid in the same
window. In the full-suite gate run for two-row-nav 08 the test received `2 !== 1`. It passed alone
(19/19) and in the nine gate runs before that one.

Decide what the test is proving. Its doc comment is about the guard counting *open* bids so the
guarantee fires again in a later window. `>= 1` in the first window, plus "a pending bid exists again
in the mid-season window", keeps that meaning without assuming no organic bid. Check that the later
assertions in the test do not make the same assumption.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The test does not depend on the world producing no organic bid
- [ ] It still fails if the guarantee stops firing in a later window
