# Archive the efforts that are already complete

Type: task
Status: open

Blocked by: 04, 05

## Question

Run the new skill over the existing backlog — the pass that validates it against real efforts rather
than a hypothetical one, and the pass that actually delivers what this map is for.

Candidates as of charting, subject to whatever ticket 01's predicate decides:

| Effort | State at charting |
|---|---|
| `e2e-coverage` | 6/6 resolved, spec handed off, distilled into `docs/e2e.md` |
| `effect-migration` | 6/6 resolved |
| `effect-v4-migration` | 7/7 resolved |
| `skill-suite-merge` | 8/8 resolved; roadmap calls its spec status stale, the work already shipped |
| `training` | 5/5 resolved, spec `ready-for-agent`, Player Development shipped |
| `effect-lint-hardening` | 2/2 on disk but roadmap says ticket 02 is unanswered — expect a reject |
| `cm-clone` | 19/20; ticket 09 honestly `ready-for-human` on the `@effect/rpc` shim |

Every one gets the judgment gate, not a bulk move. Expect at least one rejection: an effort that
looks complete mechanically and isn't is the case the shortlist exists to catch, and a pass that
archives all seven has probably failed rather than succeeded.

Done when `pnpm check:all` passes — `verify-md-links` green across every repathed reference — and
top-level `.scratch/` lists only live efforts.
