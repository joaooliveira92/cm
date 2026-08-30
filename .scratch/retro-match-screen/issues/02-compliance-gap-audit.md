# 02-compliance-gap-audit

Type: research
Status: resolved
Blocked by:

## Question

Section-by-section, how far does the existing `apps/desktop/src/renderer/components/match-screen/`
scaffold fall short of the [brief](../references/brief.md)?

Produce an inventory, not a verdict. The disposition grilling (01) buys its judgement with it.

Read the brief's 27 sections plus the scaffold's actual files
(`apps/desktop/src/renderer/components/match-screen/*.{ts,tsx,css}`, `formatters.ts`, `mock-fixtures.ts`,
`types.ts`) and score each brief section: **met** / **partial** / **missing**, with `file:line`
evidence and a one-line note. Cover at least: the three fixture scenarios (§22), the unit/component/
visual/e2e test requirements (§23), the interaction requirements (§18), the accessibility
requirements (§20), runtime validation (§16/§3), responsive scaling (§4/§19), and the design-token /
naming-convention call of §5/§6. Note where the scaffold diverges from the brief's *proposed* data
model (e.g. `clock: { __typename }` union vs. `MatchClockState.mode`).

Also inventory the **wider working tree** facts the disposition needs: the stray
`components/MatchScreenDemo.tsx` + `components/mock-fixtures.ts` (broken `MatchScreenStateSchema`
import), and whether `MatchDayScreen.tsx` references anything under `components/match-screen`.
Do not modify any scaffold files — read-only audit.

Resolve by a research subagent; write findings to
`research/02-compliance-gap-audit.md` on a throwaway branch, with this ticket as the context
pointer.

## Answer

**The scaffold is ~70/27 sections present but with structural defects, not a finished brief answer.** §23 tests entirely unbuilt, no runtime validation (types.ts is compile-time-only; repo standard is Effect Schema, `packages/contracts/src/rpc.ts:1`), Options menu + roving tab nav + `tabpanel` + all §18/§20 interaction absent, no 4:3 canvas/scale model (§4/§19), incidents grid miswired (`styles.css:485` template with only two grid children — away column lands in a 60px track), preformatted dates stored in fixtures (§12.4 violated), clock model can't represent calendar sidebar mode, and Scenario 1 periods don't sum to 5-3 while Scenario 3 ships 3 tabs not 5. Closing the gap is a real build — small feature list, some repo-wide renames — not cosmetic fixes. See [findings](research/02-compliance-gap-audit.md).