# 05 — Refactor CreationStep1: extract ArchetypeSelector, PillarDistribution, CreationStepper

Type: task
Status: claimed

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