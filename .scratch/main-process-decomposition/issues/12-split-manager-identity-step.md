# 12: Split `renderer/create/ManagerIdentityStep.tsx` (621 lines)

Type: task
Status: resolved

**What to build:** one component file carrying a multi-step form, its whole presentation vocabulary
and its pillar-allocation arithmetic. The data tables at the top are static and re-read on every
visit to the file:

| Target | Symbols |
|---|---|
| `create/managerIdentityCopy.ts` | `STEPS`, `PILLAR_DISPLAY_NAMES`, `PILLAR_ACCENTS`, `PILLAR_WARNINGS`, `TOTAL_PILLAR_POINTS`, `MIN_PILLAR_VALUE`, `MAX_PILLAR_VALUE`, `sumPillars`, `panelVariants` |
| `create/ManagerPillarsPane.tsx` | the pillar-allocation sub-step: the sliders/steppers, the remaining-points readout and its warnings |
| `create/ManagerIdentityStep.tsx` | the step machine and the personal-details sub-step |

Split along the existing sub-step boundary rather than by line count -- `ManagerSubStep` already
names the seam.

## Constraints

- `test/manager-identity-step-pillars.test.tsx` and `test/create-flow-generation.test.tsx` drive
  this component through the DOM. Query selectors and ARIA roles must not change.
- Keyboard reachability is specified behaviour here (`test/level1-a11y.test.tsx`); focus order
  through the pillar controls must be identical after the extraction.
- Values in `PILLAR_ACCENTS` / `PILLAR_WARNINGS` are copy, not logic. Move them verbatim.

**Blocked by:** 07.

Landed as `managerIdentityCopy.ts` (78), `ManagerPillarsPane.tsx` (319) and a 274-line
`ManagerIdentityStep.tsx`. `ManagerPillarsPane` renders the *contents* of the step-2
`motion.section`, not the section itself, so `AnimatePresence`'s direct child and its
`custom`/`variants` wiring are byte-identical to before.

- [ ] No file in `renderer/create/` exceeds 400 lines. *The three files this ticket names are all
  under. `useCreateSession.ts` is 418 lines -- a pre-existing overrun this ticket does not name and
  did not touch.*
- [x] The three specs above pass unchanged.
- [ ] `pnpm check:all` is green at this commit. *Ran `typecheck`, `lint`, `effect-lint`,
  `verify-md-links` and the three named specs; the full `test` gate is the orchestrator's.*
