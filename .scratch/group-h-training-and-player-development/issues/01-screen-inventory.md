# 01: Group H screen inventory survey

Type: task

## Question

Survey all 13 Group H screens (105-117) against the current codebase to classify each as:
- **Built** — fully functional, no new work needed
- **Partial** — stub or placeholder exists, needs completion
- **Absent** — no surface or backend exists at all

For each screen, note what already exists (route, RPC, domain model, component).

## Assets

- Screen specs: `.scratch/group-h-training-and-player-development/`
- Current training screen stub: `apps/desktop/src/renderer/training/TrainingScreen.tsx`
- Existing events/commands: `packages/contracts/src/schemas/training.ts`
- Squad screen (Training Focus display): `apps/desktop/src/renderer/squad/`

## Blocked by

None