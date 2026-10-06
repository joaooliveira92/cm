# Active Leagues Setup Screen Implementation Brief

## 1. Objective

Implement a desktop-first **new game configuration screen** for `@cm-clone/desktop`.

The screen must evoke the same management-game spirit as the reference through:

- High information density
- A large configuration workspace
- A narrow, persistent summary sidebar
- Compact table-like controls
- Advanced settings placed below the primary configuration
- A clear bottom-right decision area
- Immediate feedback about the consequences of the selected configuration

Do not reproduce the original screen literally. Avoid copying:

- Original colors
- Original typography
- Original competition names
- Original button silhouettes
- Original icons
- Original decorative background
- Original rating stars
- Original wording

The result should feel native to the existing CM Clone design system.

---

## 2. Technical constraints

Use the packages already available in `@cm-clone/desktop`.

### Required technologies

- React 19
- Strict TypeScript
- Tailwind CSS 4
- `@base-ui/react` for accessible interactive primitives
- `@effect/atom-react` for reactive client state
- `effect` for validation, derived state, and domain-safe operations
- `@tanstack/react-table` for the league configuration model
- `@tanstack/react-router` for navigation
- `lucide-react` for UI icons
- `motion` for restrained layout transitions
- Vitest and Testing Library for component tests
- Playwright for the critical setup flow

Do not add another component library, form library, global state manager, icon library, or CSS-in-JS solution.

---

## 3. Architectural boundaries

Keep the screen divided into domain, application, renderer, IPC, and persistence concerns.

```text
Renderer components
    ↓ user intents
Application actions
    ↓ validated commands
Domain configuration state
    ↓ optional persistence boundary
Electron preload capability
    ↓ narrow validated IPC
Electron main process / SQLite
```

The renderer must not:

- Import Electron APIs
- Import Node.js APIs
- Access SQLite directly
- Read or write files directly
- Depend on main-process implementation details
- Maintain an independent copy of derived summary values

The screen can remain renderer-local while creating a draft. Invoke IPC only when a draft must be loaded, saved, or used to create a campaign.

Expose narrow preload capabilities such as:

```ts
gameSetup.loadDraft()
gameSetup.saveDraft(command, options)
gameSetup.createCampaign(command, options)
```

Do not expose:

```ts
ipcRenderer
database
sql
filesystem
generic invoke(channel, payload)
```

Every IPC input and output must be validated at the boundary using the project’s established contract validation approach.

---

## 4. Screen component hierarchy

Use the following conceptual structure:

```text
ActiveLeaguesSetupRoute
└── ActiveLeaguesSetupScreen
    ├── SetupIntroduction
    │   ├── CurrentTeamSelection
    │   ├── ContextDescription
    │   └── ActiveLeaguesDescription
    │
    ├── SetupContent
    │   ├── LeagueConfigurationWorkspace
    │   │   ├── LeagueConfigurationTable
    │   │   │   ├── LeagueTableHeader
    │   │   │   └── LeagueConfigurationRow[]
    │   │   ├── LeagueWorkspaceActions
    │   │   └── AdvancedOptionsSection
    │   │
    │   └── SetupImpactSidebar
    │       ├── DatabaseSizeSelector
    │       ├── SimulationPerformanceEstimate
    │       ├── SetupWarnings
    │       ├── FlexibleSpacer
    │       └── GameStartDateSelector
    │
    └── SetupScreenFooter
        ├── CancelAction
        └── ContinueAction
```

Avoid one oversized component containing all state and rendering logic.

Route components should primarily:

- Load initial data
- Handle navigation
- Connect state to application actions
- Render the screen component

Presentational components should not call IPC directly.

---

## 5. Desktop layout

The screen should occupy the full available Electron renderer viewport.

Use a grid with:

- One flexible main workspace
- One fixed or clamped summary sidebar
- A footer action region aligned with the sidebar

Suggested structural CSS:

```css
.setup-screen {
  min-height: 100%;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    clamp(18rem, 18vw, 22rem);
  grid-template-rows:
    auto
    minmax(0, 1fr)
    auto;
  column-gap: 0.75rem;
  padding:
    1.75rem
    1.5rem
    0.5rem
    2rem;
}
```

Equivalent Tailwind classes may be used, but repeated grid definitions should be extracted into a component or reusable class rather than duplicated as arbitrary values.

### Main relationships

- The introduction spans the main workspace.
- The league configuration occupies most of the available width.
- The summary sidebar remains visible on the right.
- The advanced options remain attached to the bottom of the main workspace.
- The final actions appear below the sidebar and align to its right edge.
- The league list can grow without pushing the advanced options outside the viewport.
- If the list exceeds its available vertical space, only the list region should scroll.

Avoid making the entire screen scroll unless the available window height becomes exceptionally small.

---

## 6. Introduction area

The introduction should communicate:

1. The currently selected team, club, or organization
2. A nearby action to change the selection
3. A short explanation of when the team may be selected
4. The purpose of active leagues
5. The performance implications of selecting more leagues

Recommended relationships:

```text
Current selection + Change action
6–8px
Selection helper text
28–36px
Section heading
8–12px
Section explanation
40–52px
League configuration header
```

The change action must remain inline with the current selection instead of being placed at the far-right edge.

Example component relationship:

```tsx
<div className="flex items-center gap-2">
  <span>{currentTeamLabel}</span>
  <ChangeTeamButton />
</div>
```

The introduction should not become a hero section. Keep the heading concise and preserve space for the configuration controls.

---

## 7. League configuration table

Use `@tanstack/react-table` for:

- Stable row identity
- Column definitions
- Row-model generation
- Rendering consistency
- Keyboard and test targeting
- Future sorting or grouping support

Do not rely on TanStack Table for state ownership. The authoritative configuration state belongs to the setup state model.

Because the cells contain interactive form controls, render the body with CSS Grid rather than relying exclusively on native table layout.

### Columns

Use four conceptual columns:

```text
League selector | Simulation depth | Recommendation | Remove
```

Suggested proportions:

```css
grid-template-columns:
  minmax(22rem, 1.65fr)
  minmax(10rem, 0.55fr)
  minmax(16rem, 1.15fr)
  2rem;
```

The first column must be the widest.

The remove column must only be wide enough for an icon button.

### Column responsibilities

#### League selector

Contains:

- League, region, or competition emblem
- Competition name
- Scope description, when applicable
- Selector indicator

Use a Base UI menu, select, or popover primitive according to the existing application conventions.

#### Simulation-depth selector

Contains a small controlled set of modes, such as:

- Full simulation
- Standard simulation
- Results only

Do not repeat the original labels unless the labels already belong to the CM Clone domain.

#### Recommendation

This is informational, not editable.

Possible reasons include:

- Selected country
- High-relevance competition
- Neighboring region
- Connected player market
- Recommended for the selected club

Use an icon and visible text. Do not communicate the category through the icon alone.

#### Remove action

Use a compact `lucide-react` icon button with an accessible league-specific label:

```tsx
aria-label={`Remove ${league.name}`}
```

Do not use a textless control without an accessible name.

---

## 8. Row density and spacing

Each league row should remain compact.

Recommended dimensions:

- Row control height: `30–34px`
- Gap between rows: `3–4px`
- Gap between columns: `8px`
- Horizontal control padding: `10–12px`
- Emblem-to-label gap: `8px`
- Remove target: at least `30 × 30px`

Representative structure:

```tsx
<div className="league-grid grid items-center gap-x-2">
  <LeagueSelector />
  <SimulationDepthSelector />
  <RecommendationReason />
  <RemoveLeagueButton />
</div>
```

Do not present each row as a spacious card. The compact repeated structure is central to the screen’s management-game identity.

### Hover and focus

- Hover may create a subtle relationship across the row.
- Keyboard focus must remain visible on the focused control.
- Hover must not replace focus indication.
- Selecting a control must not cause the row height to change.
- Long labels should truncate with an accessible full-value tooltip.

---

## 9. League-list behavior

Required interactions:

- Add a league
- Remove a league
- Change one league’s simulation depth
- Change the setup preset
- Open the broader league-management workflow
- Prevent duplicate league selections
- Preserve stable row identity during changes
- Recalculate derived estimates after each relevant change

Use a stable league ID as the React and TanStack row ID.

Do not use the array index as the row key.

When adding or removing rows, use `motion` only for a restrained layout transition. Avoid large entrance animations, staggered effects, or spring-heavy movement.

Transitions should respect reduced-motion preferences.

---

## 10. Flexible area beneath the league rows

Maintain deliberate empty space between the league list and the workspace actions when the list is short.

Structure the main section using a column flex layout:

```tsx
<section className="flex min-h-0 flex-1 flex-col">
  <LeagueConfigurationTable />
  <div className="mt-auto">
    <LeagueWorkspaceActions />
  </div>
</section>
```

If the rows overflow, make the rows region scrollable:

```tsx
<div className="min-h-0 overflow-y-auto">
  <LeagueRows />
</div>
```

Keep the table header visible while the rows scroll if implementation complexity remains reasonable.

---

## 11. Workspace actions

Below the league list, place two secondary actions on opposite sides:

```text
[ Setup preset ]                    [ Manage leagues ]
```

The left action selects a complete configuration preset.

The right action opens the workflow used to add or remove available leagues.

Use:

```tsx
<div className="flex items-center justify-between px-2 pb-5">
  <SetupPresetSelector />
  <ManageLeaguesButton />
</div>
```

These actions must remain visually subordinate to the final continue action.

The “Manage leagues” action should not be placed in the table header because it changes which rows exist, rather than modifying a property of an existing row.

---

## 12. Advanced options

Place advanced settings below a full-width separator.

Use a collapsible Base UI primitive if the project already uses an accessible disclosure component. Otherwise, implement the disclosure using a native button with correct `aria-expanded` and `aria-controls` relationships.

Structure:

```text
Separator
Advanced options heading                        Expand/collapse
Two-column option grid
```

### Option grid

On wide desktop screens:

```css
grid-template-columns: repeat(2, minmax(0, 1fr));
column-gap: 1rem;
row-gap: 0.125rem;
```

Each option contains:

- Checkbox
- Optional information or help button
- Visible label

Use Base UI checkbox primitives.

Do not make the information icon part of the label if the icon opens separate explanatory content. The help control must be independently keyboard accessible.

Each option row should retain a compact height of approximately `28–32px`.

### Possible CM Clone option categories

Instead of duplicating the reference options, organize settings around the game’s own domain:

- Roster generation
- Match simulation
- Transfer-market behavior
- Staff generation
- Information visibility
- Editor or developer capabilities

If the number of options grows significantly, divide the section into labeled groups rather than extending an undifferentiated checklist.

---

## 13. Summary sidebar

The summary sidebar must be a persistent consequence panel rather than a second form.

Use a vertical flex layout:

```tsx
<aside className="flex min-h-0 flex-col">
  <DatabaseSizeSelector />
  <SimulationPerformanceEstimate />
  <SetupWarnings />
  <div className="flex-1" />
  <GameStartDateSelector />
</aside>
```

### Database-size control

The top portion contains:

- A concise label
- A full-width selector
- The estimated number of loaded players, staff, or entities
- Optional short description

The entity count must be derived from the active configuration. Do not hardcode a displayed total independently from the state model.

### Performance estimate

Replace the original star rating with a distinct CM Clone representation, such as:

- A five-segment bar
- A compact performance meter
- A labeled status with a progress track
- A low, balanced, high simulation-cost indicator

The estimate must be derived from factors such as:

- Number of active leagues
- Simulation depth per league
- Database-size preset
- Optional advanced settings
- Any engine-specific complexity multiplier

The sidebar should display:

- Compact visual estimate
- Human-readable category
- Concise explanation
- Relevant warning when the setup is unusually expensive

Do not describe hardware capability unless CM Clone actually performs hardware benchmarking. Prefer language such as:

> This configuration is expected to produce longer processing intervals.

### Start date

Pin the start-date selector to the bottom of the sidebar with `margin-top: auto`.

The selectable dates should be supplied by the domain or application layer based on the selected competitions. Do not define unrelated dates directly in the component.

---

## 14. Footer actions

Place the final actions below the sidebar:

```text
[ Cancel ] [ Continue ]
```

Use a right-aligned flex container.

The primary action should communicate the next actual step. Use a label such as:

- Continue
- Review setup
- Create campaign

Do not use “Start Game” if more setup steps remain.

The footer should:

- Remain outside the sidebar panel
- Align with the sidebar’s right edge
- Use a small gap between actions
- Keep the primary action wider or more visually prominent
- Display pending state while creation is running
- Prevent duplicate submission

When submission starts:

- Disable actions that would invalidate the running command.
- Pass an `AbortSignal` into the application operation where cancellation is supported.
- Restore an actionable state if creation fails.
- Surface an understandable error without exposing stack traces or database details.

---

## 15. State model

Use one authoritative setup state and derive all summaries from it.

Suggested conceptual model:

```ts
interface GameSetupState {
  readonly selectedTeamId: TeamId | null;
  readonly activeLeagues: ReadonlyArray<ActiveLeagueConfiguration>;
  readonly databasePreset: DatabasePresetId;
  readonly startDate: CampaignStartDate;
  readonly advancedOptions: AdvancedGameOptions;
}
```

A configured league should have stable identity:

```ts
interface ActiveLeagueConfiguration {
  readonly leagueId: LeagueId;
  readonly simulationDepth: SimulationDepth;
}
```

Derived values should not be written into the authoritative state:

```ts
interface GameSetupSummary {
  readonly activeLeagueCount: number;
  readonly estimatedEntityCount: number;
  readonly estimatedProcessingCost: ProcessingCost;
  readonly recommendationReasons: ReadonlyMap<
    LeagueId,
    RecommendationReason
  >;
  readonly warnings: ReadonlyArray<SetupWarning>;
  readonly validationStatus: SetupValidationStatus;
}
```

Derived values include:

- Estimated entity count
- Processing-cost classification
- Recommendation reasons
- Available start dates
- Validation status
- Warning messages
- Whether continuation is allowed

---

## 16. Effect Atom responsibilities

Use `@effect/atom-react` to expose small, focused atoms.

Conceptual division:

```text
Setup source atom
├── Selected team
├── Active league configurations
├── Database preset
├── Start date
└── Advanced options

Derived atoms
├── Setup summary
├── Performance estimate
├── Available start dates
├── Validation result
└── Can continue
```

Prefer derived atoms over synchronizing values with effects.

Avoid patterns such as:

```tsx
useEffect(() => {
  setEstimatedPlayers(calculateEstimatedPlayers(setup));
}, [setup]);
```

Prefer a derived atom or pure selector so the value cannot become stale.

Keep application operations separate from UI state. Saving or creating a campaign should be modeled explicitly as an operation with:

- Idle
- Pending
- Success
- Failure

Do not encode asynchronous operation status into several unrelated booleans.

---

## 17. Domain and application responsibilities

### Domain layer

The domain layer should own:

- Valid simulation-depth values
- Duplicate-league prevention
- At least one active-league requirement, if applicable
- Valid start dates
- Recommendation calculation
- Performance-cost calculation
- Entity-count estimation
- Advanced-option incompatibilities

### Application layer

The application layer should own use cases such as:

```text
loadGameSetupDraft
changeSelectedTeam
addActiveLeague
removeActiveLeague
changeSimulationDepth
applySetupPreset
changeDatabasePreset
changeStartDate
changeAdvancedOption
saveGameSetupDraft
createCampaign
```

UI components should emit explicit intents rather than modifying arbitrary object paths.

Prefer:

```ts
changeSimulationDepth({
  leagueId,
  simulationDepth,
});
```

Avoid:

```ts
updateSetup("activeLeagues.3.mode", value);
```

---

## 18. Persistence and IPC

If the setup is persisted, define the schema in the shared contracts package or another appropriate cross-boundary package.

The contract should include:

- A versioned draft format
- Valid league IDs
- Valid simulation-depth values
- Database preset
- Start date
- Advanced options
- Validation errors with stable codes

The main process must revalidate all commands even when the renderer has already validated the same values.

Treat renderer input as untrusted.

If draft saving occurs automatically:

- Debounce saves at the application boundary.
- Cancel stale save operations.
- Do not save every keystroke or checkbox transition as an independent database transaction.
- Ensure the latest successful state is identifiable.
- Flush or cancel pending work during deterministic screen disposal.

---

## 19. Accessibility

Required accessibility behavior:

- All controls must be keyboard accessible.
- Focus order must follow the visual order.
- Selector triggers must expose their expanded and controlled states.
- Remove buttons must identify the affected league.
- Recommendation indicators must include visible text.
- Performance changes should be announced through a polite live region.
- Validation failures should be connected to the relevant control.
- The advanced-options trigger must expose expansion state.
- Tooltips must not contain essential information unavailable elsewhere.
- Icon-only buttons must have accessible names.
- Reduced-motion preferences must be honored.
- Focus must move predictably after removing a league.

After row removal, focus should move to:

1. The next row’s equivalent control
2. Otherwise the previous row’s equivalent control
3. Otherwise the “Manage leagues” action

---

## 20. Responsive and window-size behavior

The Electron application is desktop-first, but the screen must tolerate resized windows.

### Wide layout

At approximately `1280px` and above:

- Main workspace and sidebar remain side by side.
- All table columns remain visible.
- Advanced options use two columns.

### Medium layout

Between approximately `960px` and `1279px`:

- Preserve the sidebar.
- Allow recommendation labels to truncate.
- Reduce nonessential horizontal padding.
- Maintain usable selector widths.
- Prevent the remove button from overlapping content.

### Narrow layout

Below approximately `960px`:

- Move the sidebar summary into the main document flow.
- Place the summary after the league configuration and before advanced options.
- Make footer actions sticky along the bottom.
- Adapt each league row into two lines.

Suggested compact row relationship:

```text
[ League selector                                  ]
[ Simulation depth ] [ Recommendation ] [ Remove ]
```

Do not shrink desktop controls until labels become unreadable.

---

## 21. Suggested renderer organization

Adapt paths to the repository’s existing conventions:

```text
src/renderer/features/game-setup/
├── application/
│   ├── game-setup.actions.ts
│   ├── game-setup.operations.ts
│   └── game-setup.ports.ts
│
├── domain/
│   ├── game-setup.model.ts
│   ├── game-setup.validation.ts
│   ├── game-setup-estimate.ts
│   └── league-recommendation.ts
│
├── state/
│   ├── game-setup.atom.ts
│   ├── game-setup-summary.atom.ts
│   └── game-setup-operation.atom.ts
│
├── components/
│   ├── active-leagues-setup-screen.tsx
│   ├── setup-introduction.tsx
│   ├── league-configuration-table.tsx
│   ├── league-configuration-row.tsx
│   ├── league-selector.tsx
│   ├── simulation-depth-selector.tsx
│   ├── recommendation-reason.tsx
│   ├── advanced-options-section.tsx
│   ├── setup-impact-sidebar.tsx
│   └── setup-screen-footer.tsx
│
├── routes/
│   └── active-leagues-setup.route.tsx
│
└── tests/
    ├── game-setup-estimate.test.ts
    ├── game-setup.validation.test.ts
    ├── league-configuration-row.test.tsx
    └── active-leagues-setup-screen.test.tsx
```

Do not move domain calculations into `components/`, even when the calculation initially appears small.

---

## 22. Testing requirements

### Unit tests

Cover:

- Duplicate league prevention
- League removal
- Simulation-depth changes
- Preset application
- Entity-count estimation
- Processing-cost estimation
- Start-date availability
- Advanced-option incompatibilities
- Invalid empty setup
- Recommendation calculation

Use deterministic fixtures. Do not depend on current time, random IDs, or real database contents without controlled adapters.

### Component tests

Cover:

- All configured leagues are rendered.
- Changing simulation depth emits the correct intent.
- Removing a league targets the correct stable ID.
- The advanced section expands and collapses.
- Derived summary values update after configuration changes.
- Keyboard navigation reaches all controls.
- Accessible names exist for icon-only actions.
- The continue action is disabled when validation fails.
- Failure state is presented when campaign creation fails.

### End-to-end test

Create one focused Playwright flow:

1. Open the active-leagues setup screen.
2. Add a league.
3. Change its simulation depth.
4. Change the database preset.
5. Toggle an advanced option.
6. Verify that the performance estimate changes.
7. Select a valid start date.
8. Continue.
9. Verify navigation to the expected next step or successful campaign creation.

Prefer role-based selectors over CSS selectors or implementation-specific class names.

---

## 23. Acceptance criteria

The implementation is complete when:

- The screen preserves the broad-workspace and narrow-summary relationship.
- League rows remain dense and independently editable.
- The league list grows within its allocated area.
- Advanced options remain visually secondary.
- The sidebar is based entirely on authoritative or derived state.
- The start date remains pinned to the lower sidebar region on wide layouts.
- The final action remains isolated at the bottom-right.
- No Electron or Node API is imported by renderer components.
- Every IPC request and response is validated.
- No state is duplicated between the form and sidebar.
- No array indexes are used as league-row keys.
- The interface is fully keyboard operable.
- Reduced-motion behavior is respected.
- Unit, component, type-check, build, and end-to-end validations pass.

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Include the outcomes in the implementation report.

---

## 24. Design principle

The final screen should follow this principle:

> Present dense editable setup data in the primary workspace, show the consequences of those choices in a persistent side panel, keep uncommon controls below the main workflow, and isolate the final commitment action at the bottom-right.

The implementation should reproduce that structural rhythm while maintaining an original CM Clone identity.

## Suggested commit

```text
feat(desktop): add active leagues game setup screen
```
