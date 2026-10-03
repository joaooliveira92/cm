# Group A Reconciliation Deviation Register

## Screen 01 – Main Application Shell
- **Status**: out-of-scope
- **Description**: Primary navigation entry point; audited against spec 01 with 28 ledger rows, no code changes required.

## Screen 02 – New Game
- **Status**: contradicted
- **Description**: Implementation follows a three-step creation flow with invisible world generation, contradicting the original spec.

## Screen 03
- **Status**: contradicted
- **Description**: Missing routes, components, or screens; survival sections classified as contradictions.

## Screen 04
- **Status**: contradicted
- **Description**: Missing routes, components, or screens; survival sections classified as contradictions.

## Screen 05
- **Status**: contradicted
- **Description**: Missing routes, components, or screens; survival sections classified as contradictions.

## Screen 06
- **Status**: contradicted
- **Description**: Missing routes, components, or screens; survival sections classified as contradictions.

## Screen 07
- **Status**: out-of-scope
- **Description**: Game Status screen ruled out of scope; survivors redistributed into CareerChrome, Save List, and About dialog.

## Screen 08
- **Status**: contradicted
- **Description**: Missing routes, components, or UI; survival sections classified as contradictions.

## Screen 09
- **Status**: contradicted
- **Description**: Missing routes, components, or screens; all surviving sections classified as contradictions.

## Screen 10
- **Status**: contradicted
- **Description**: Missing routes, components, or screens; survival sections classified as contradictions.

## Screen 11
- **Status**: contradicted
- **Description**: Thin complement to screen 2 audit; classified as contradiction.

## Screen 12
- **Status**: contradicted
- **Description**: Absence of required routes, components, or screens; classified as contradiction.

## Screen 13
- **Status**: contradicted
- **Description**: Absence of required routes, components, or screens; classified as contradiction.

## Screen 14
- **Status**: contradicted
- **Description**: Absence of required routes, components, or screens; classified as contradiction.

## Screen 15
- **Status**: contradicted
- **Description**: Absence of required routes, components, or screens; classified as contradiction.

## Screen 16
- **Status**: contradicted
- **Description**: Absence of required routes, components, or screens; classified as contradiction.

## Screen 17
- **Status**: contradicted
- **Description**: Absence of required routes, components, or screens; classified as contradiction.

## Screen 18 – Game Status
- **Status**: out-of-scope
- **Description**: Ruled out of scope; survivors (career date/season, save identity, world entity counts, app version, save schema version, sacked-and-archived status) redistributed into CareerChrome, Save List, and About dialog.

## Screen 19 – Manager Profile
- **Status**: renamed
- **Description**: Screen redefined as "Manager Profile" screen showing profile identity (name, archetype, pillars, club, tenure) with a passive Active/Archived status badge; "Manager Status" retired as domain term.

## Screen 20 – Retire Manager
- **Status**: renamed
- **Description**: Retirement treated as second cause of Archived Save; introduces `ManagerRetired` event and nullable `archived_cause` column, replacing the `sacked` boolean. Guard renamed to `assertSaveNotArchived`, confirmed by Irreversibility Disclosure dialog.

## Screen 21 – Quit Confirmation
- **Status**: renamed
- **Description**: Guards one intent (close_application) with provisional-career exception; before-quit guard with renderer IPC; dialog-only (no keyboard shortcut for quit).
