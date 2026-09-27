# 01: Step 2B — Manager Style & Appearance pane

**Status:** ready-for-agent

**What to build:** A second half to the Manager step that rounds out the profile: a visual avatar
baseline (portrait plus accent colours) and an initial tactical identity (preferred formation and
play style) that pre-fills the manager's first Tactic. The old archetype picker was retired when
personal details were rebuilt (`apps/desktop/src/renderer/create/useCreateSession.ts`), so Step 2
currently means personal details + pillar allocation and nothing else.

This is a self-contained step: cosmetic choice plus a tactical default, with no dependency on the
manager-reputation/jobs work (group N).

## Requirements (as reviewed)

### 1. DB schema
- Add appearance storage to `manager_profile` (portrait and accent colours).
- Add a preferred formation.
- Add a play style / tactical philosophy.

### 2. Contracts & main
- Extend `ManagerProfileView` and `commitCareer`'s payload end-to-end, with a round-trip test.
- The preferred formation/style pre-fills the manager's first Tactic (see decision 3 for how).

### 3. Renderer (`ManagerStyleAppearancePane`)
- Appearance: a responsive avatar/portrait grid and colour pickers.
- Tactical identity: formation and play-style pickers.
- Gating: include the new choices in Step 2's completeness predicate.

### 4. Testing
- Contract round-trip for the new fields.
- Playwright coverage extending `e2e/fillPersonalDetails.ts`.

## Resolved decisions

These were settled at triage and shape the implementation; the reasoning is recorded in the Agent
Note that ships with the implementing commit.

1. **Formation uses the existing rule enum.** `FORMATIONS` in `packages/shared/src/rules/tactics.ts`
   (`4-4-2`, `4-3-3`, `4-5-1`, `3-5-2`, `5-3-2`) is the picker's list and the stored value. The
   draft's `"4-3-3-DM"` is dropped.

2. **Play style is a shared code enum of presets, not a table.** Add a preset enum in
   `packages/shared/src/rules/tactics.ts` (alongside `FORMATIONS`), each preset mapping to a
   `(mentality, tempo, pressing)` triple drawn from the Tactic's own axes. Store
   `manager_profile.preferred_style_id` as the preset id. No `tactical_styles` table: nothing reads
   a style row at runtime, so it would be a mirror with no reader. User-facing names like
   "Gegenpress" or "Tiki-Taka" are labels on presets, not stored values.

3. **Keep the empty start; pre-fill the editor, never write at commit.** A new career continues to
   start with no Tactic and the `no-tactic` `MatchNotReadyError` onboarding gate stays. The rule is:
   whenever no Tactic is persisted, the Tactics editor opens seeded from the manager's preferred
   formation and style. No new write path is added to `commitCareer`, so the standing decision
   ("a new career genuinely starts with no Tactic — deliberately not repaired here",
   `test/main/season/advance.test.ts`) is honoured rather than reversed.

4. **Avatar is flat columns plus a code-generated fallback.** `manager_profile` gains
   `avatar_portrait_key` (`TEXT`, nullable, a key a code registry can resolve; null when none),
   `avatar_primary_color` and `avatar_secondary_color` (`TEXT`, hex). No JSON blob: the schema is
   normalized. Until a manager-portrait asset set exists, the panel offers colour/initials
   generation, and `avatar_portrait_key` is reserved for when assets land — it is not populated
   from artwork this ticket does not ship.

5. **A third sub-step of the Manager step.** `ManagerSubStep` extends from `1 | 2` to `1 | 2 | 3`;
   the new pane is sub-step 3. Formation and style are required; the avatar is optional. The
   completeness predicate gains the two required tactical fields, and the bottom bar and in-panel
   stepper drive the extra panel the same way they drive the existing two.

## Out of scope

- Manager career background / reputation / coaching badges (group N). Deliberately skipped.
- Any avatar art production. If portraits are chosen, this ticket consumes an asset set; it does
  not create one.

## Acceptance criteria

- [ ] `manager_profile` gains flat `preferred_formation`, `preferred_style_id`,
      `avatar_portrait_key` (nullable), `avatar_primary_color`, and `avatar_secondary_color`
      columns; `commitCareer` and `ManagerProfileView` carry them.
- [ ] `preferred_formation` is one of `FORMATIONS`; `preferred_style_id` is one of the new shared
      preset ids, each mapping to a `(mentality, tempo, pressing)` triple.
- [ ] Step 2's sub-step 3 (`ManagerStyleAppearancePane`) offers the formation and style pickers and
      the colour/initials avatar controls; the bottom bar and in-panel stepper drive it.
- [ ] Formation and style are required by the completeness predicate; the avatar is optional.
- [ ] A career with no persisted Tactic opens the Tactics editor seeded from the manager's preferred
      formation and style; a career with a Tactic is unaffected, and `commitCareer` writes no Tactic.
- [ ] The `no-tactic` `MatchNotReadyError` blocker still fires for a new career.
- [ ] Contract round-trip test added; `e2e/fillPersonalDetails.ts` extended; `pnpm check:all` green.

## Comments

- Filed from the review of the "Step 2B" draft. The draft's requirement 2b ("scaffold the initial
  Tactic at save generation") collided with the standing empty-start decision, so it is called out
  separately rather than folded into the requirements.
- Triaged and promoted to `ready-for-agent` the same day: the five decisions in "Resolved
  decisions" were settled, replacing the draft's `4-3-3-DM` formation, `tactical_styles` table,
  commit-time Tactic seeding, JSON avatar blob, and open step-structure question. The reasoning is
  to be recorded in the Agent Note that ships with the implementing commit, not filed in advance.
