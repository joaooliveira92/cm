# 07 — Refactor CreateFlowLayout: extract generation hook and ReviewPane

Type: task
Status: needs-triage

> **Relabelled 2026-09-06 (tracker sweep).** This ticket was sitting at `Status: claimed` with its
> `## Answer` still holding the untouched `<!-- to be filled by implementation -->` placeholder, so
> no work had ever started on it. Ten of this effort's sixteen tickets were in that state.
> `claimed` is a lock -- [issue-tracker.md](../../../docs/agents/issue-tracker.md) has the frontier
> scan skip claimed tickets -- so the effort looked in progress while nothing could pick it up.
> **Why `needs-triage` and not `ready-for-agent`:** `CreateFlowLayout.tsx` is now 75 lines (target:
> under 200) and `ReviewPane` exists. The `useGeneration` hook named below does not -- generation
> lives in `create/generation.ts` and `create/useCreateSession.ts`. Decide whether the remaining
> boolean-prop item justifies keeping this open.
## Problem

`CreateFlowLayout.tsx` (598 lines) has several composition issues:

1. **Complex session state** – Session state with generation flow mixed with UI
2. **Boolean prop proliferation** – `selectionReady`, `managerStepComplete`, `blocked`
3. **Multiple concerns mixed** – Generation flow, career commit, navigation
4. **State not lifted** – Generation state trapped in component, hard to share with preview components

## Solution

### Phase 1: Extract `useGeneration` custom hook
Create a hook that manages generation state independently from UI:

```tsx
interface GenerationState {
  selectionReady: boolean
  managerStepComplete: boolean
  blocked: boolean
  status: "idle" | "generating" | "complete" | "error"
}

interface useGeneration {
  (): {
    state: GenerationState
    actions: {
      setSelectionReady: (ready: boolean) => void
      setManagerStepComplete: (complete: boolean) => void
      generate: () => Promise<void>
    }
  }
}
```

### Phase 2: Extract `ReviewPane`
Create a compound component for the review panel:
- `ReviewPane.Root` – the container
- `ReviewPane.Summary` – generation summary
- `ReviewPane.Actions` – confirm/retry actions

### Phase 3: Lift state to provider
If the generation state needs to be shared with sibling components (e.g., preview), lift it into a `GenerationProvider` context.

### Phase 4: Replace boolean props
- Remove `selectionReady`, `managerStepComplete`, `blocked` booleans
- Use explicit variant components for different generation stages

## Blocking

- Blocked by: None (can be worked independently)

## Done When

- `CreateFlowLayout.tsx` reduced to under 200 lines
- No boolean prop proliferation in creation flow components
- `useGeneration` hook exists
- `ReviewPane` compound component exists
- `pnpm check:all` passes

## Answer

<!-- to be filled by implementation -->

## Comments

- The generation state should be lifted if the review pane needs to show live preview during generation.
- The `blocked` boolean suggests a state machine pattern would be more appropriate.
- Consider whether the generation flow needs a formal state machine for complex transitions.