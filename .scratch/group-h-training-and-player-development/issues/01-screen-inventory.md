# 01: Group H screen inventory survey

Type: task
Status: resolved

## Answer

### Classification

| Screen | Status | What exists |
|---|---|---|
| 105 Training Overview | **Partial** | Shell screen (14-line stub at `training/TrainingScreen.tsx`), route exists |
| 106 Training Calendar | **Absent** | No code; season calendar exists for fixtures only |
| 107 Training Unit Assignment | **Absent** | No concept exists |
| 108 Individual Training Plan | **Partial** | Training Focus only (1-category-per-season toggle); full RPC/event/db/domain |
| 109 Position/Role Training | **Absent** | No concept exists |
| 110 Additional Focus/Traits | **Absent** | No concept exists |
| 111 Coaching Assignments | **Partial** | Coach model exists (`staff.ts`, `coachModifier`); no assignments UI |
| 112 Workload/Recovery | **Partial** | Condition/recovery engine exists; no training workload UI |
| 113 Performance Report | **Partial** | PlayerCoachReport stub (15-line placeholder), route exists |
| 114 Player Dev Centre | **Partial** | Per-player dev screen (98 lines) + full domain logic (`developPlayer`, `developPlayersForSeason`) |
| 115 Mentoring Groups | **Absent** | No concept exists |
| 116 Youth Intake | **Partial** | ClubYouthDetail stub; nation `youthProduction` data unused |
| 117 Training Camp | **Absent** | Pre-season is season-phase only; no training camp mechanics |

### Backend fully implemented
- Training Focus (`TrainingFocusSetEvent`, `setTrainingFocus` RPC, `training_focus` table)
- Player Development (`developPlayer` in `packages/shared/src/rules/training.ts`, `developPlayersForSeason` in `main/club/development.ts`)
- Coach modifier (`coachModifier` in `packages/shared/src/rules/staff.ts`)
- Condition/recovery (`conditionAfterDays`, `recoverClubFitness`)