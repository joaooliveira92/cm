# 05 — Refactor CreationStep1: extract ArchetypeSelector, PillarDistribution, CreationStepper

Type: task
Status: claimed

## Retargeted 2026-09-05 — read this before starting

This ticket was written against `CreationStep1.tsx` (818 lines). **That file no longer exists.** It
became `renderer/create/ManagerIdentityStep.tsx`, and ticket 12 of
[main-process-decomposition](../../main-process-decomposition/issues/12-split-manager-identity-step.md)
has since split it three ways along its existing sub-step boundary:

| File | Lines | Holds |
|---|---|---|
| `create/ManagerIdentityStep.tsx` | 274 | the step machine and the personal-details sub-step |
| `create/ManagerPillarsPane.tsx` | 319 | the pillar-allocation sub-step |
| `create/managerIdentityCopy.ts` | 78 | `STEPS`, the pillar display names, accents, warnings and bounds |

That was a mechanical extraction for file size, not a composition fix, so **this ticket's substance
is still entirely open**. Verified 2026-09-05: `isMinimum` is still a boolean prop in
`ManagerPillarsPane.tsx`, and `personalDetailsComplete`, `isActive`, `isComplete` and
`isAccessible` are still boolean props in `ManagerIdentityStep.tsx`.

Two amendments to the phases below:

- **Phase 1 (`ArchetypeSelector`) is out of scope here.** Archetype selection is no longer in this
  component; it lives in `create/ReviewPane.tsx` and `create/useCreateSession.ts`. Either retarget
  phase 1 at those files or drop it from this ticket — do not go looking for it in
  `ManagerIdentityStep.tsx`.
- **Phase 2 (`PillarDistribution`) now starts from `ManagerPillarsPane.tsx`**, which is already the
  isolated pane. Making it compound is what remains.

The "Done When" line "`CreationStep1.tsx` reduced to under 200 lines" should be read as
"`ManagerIdentityStep.tsx`".

## Problem

`CreationStep1.tsx` (818 lines) has several composition issues:

1. **Boolean prop proliferation** – `customMode`, `personalDetailsComplete`, `isSelected`, `isMinimum`, `isActive`, `isComplete`, `isAccessible` – many boolean flags controlling rendering
2. **Prop drilling** – Receives 8 callback props (onSaveNameChange, onManagerNameChange, onArchetypeChange, onPillarsChange)
3. **Multiple concerns mixed** – Personal details form, archetype selection, pillar distribution, progress stepper
4. **Motion/animation logic mixed with business logic** – Complex framer-motion integration

## Solution

### Phase 1: Extract `ArchetypeSelector` compound component
Create a compound component for archetype selection:
- `ArchetypeSelector.Root` – container
- `ArchetypeSelector.Option` – individual archetype card
- `ArchetypeSelector.Details` – selected archetype details

### Phase 2: Extract `PillarDistribution` compound component
Create a compound component for pillar distribution:
- `PillarDistribution.Root` – the distribution container
- `PillarDistribution.Slider` – individual pillar slider
- `PillarDistribution.Summary` – total + visualization

### Phase 3: Extract `CreationStepper`
Move the progress stepper into a reusable `CreationStepper` compound component:
- `CreationStepper.Root` – the stepper
- `CreationStepper.Step` – individual step
- `CreationStepper.Connector` – connecting lines

### Phase 4: Lift state into `CreationProvider`
Create a `CreationProvider` for the manager creation flow:
- Personal details (name)
- Archetype selection
- Pillar distribution
- Form validation state

```tsx
interface CreationState {
  managerName: string
  archetype: ArchetypeId | null
  pillars: PillarDistribution
  validation: ValidationState
}

interface CreationActions {
  setName: (name: string) => void
  setArchetype: (id: ArchetypeId) => void
  setPillars: (pillars: PillarDistribution) => void
  validate: () => boolean
}
```

### Phase 5: Replace boolean props with composition
- Remove `customMode`, `isSelected`, `isMinimum`, `isActive`, `isComplete`, `isAccessible`
- Use explicit component variants for each state

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- `CreationStep1.tsx` reduced to under 200 lines
- No boolean prop proliferation in creation components
- `CreationProvider` exists with generic interface
- `ArchetypeSelector`, `PillarDistribution`, `CreationStepper` are compound components
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The `personalDetailsComplete` boolean suggests the form should be split into step variants.
- `isMinimum` for pillars suggests the slider component should handle its own validation state internally.
- The motion/animation logic should be extracted into a `useMotionConfig` hook or kept in the visual variant only.