# React Composition Patterns Refactoring

## Overview
This effort addresses god components in the codebase that violate the Vercel composition patterns guidelines. The focus is on reducing boolean prop proliferation, lifting state to providers, and using compound components to enable flexible composition.

## Problem
The codebase contains several monolithic components that:
- Use excessive boolean props leading to exponential state complexity
- Mix multiple concerns (UI, state management, business logic)
- Have excessive state management within components
- Prop drill through multiple layers
- Violate separation of concerns

## Solution Approach
Refactor components following the Vercel composition patterns:
1. **Avoid Boolean Prop Proliferation** - Replace boolean flags with explicit component variants
2. **Use Compound Components** - Structure components with shared context for flexible composition
3. **Lift State into Providers** - Move state management to provider components for sibling access
4. **Decouple State Management** - Define generic context interfaces for dependency injection
5. **Prefer Children Composition** - Use children over render props for static structure

## Target Components
See individual issue files for specific refactoring targets:
- MatchDayScreen.tsx (CRITICAL)
- TransfersScreen.tsx (CRITICAL) 
- MatchControlPanel (within MatchDayScreen) (HIGH)
- SquadScreen.tsx (HIGH)
- LeagueSelectionScreen.tsx (HIGH)
- CreationStep1.tsx (HIGH)
- KeyboardSpine.tsx (HIGH)
- CreateFlowLayout.tsx (MEDIUM)
- CareerChrome.tsx (MEDIUM)
- Navigation components (Navbar, PrimaryNavItem, ContextNav) (MEDIUM)
- DataTable.tsx (MEDIUM)
- TablePanel.tsx (MEDIUM)

## References
- Vercel Composition Patterns skill: `.agents/skills/vercel-composition-patterns/`
- Specifically: `rules/architecture-avoid-boolean-props.md`, `rules/architecture-compound-components.md`, `rules/state-lift-state.md`