# 02: The World section badges `g 8`, which the keyboard spine cannot receive

Type: bug
Status: resolved

## What was measured

Found on `dev` at `fe47be6` during the review of desktop-suite-red ticket 05.

The navbar renders 8 primary sections and badges each with its position number while the level-0
`g` prefix is pending — `PrimaryNav.tsx:110` passes `hintKey={String(index + 1)}` unconditionally
for every section. The keyboard spine accepts only seven of them:

- `KeyboardStateProvider.tsx:111` — `level0Completions` filters `effectiveCompletions` by
  `/^[1-7]$/`. Hard-capped at 7.
- `allActions.ts:62-68` — seven `navAction`s, `g 1` through `g 7`. There is no `go-to-world`.

So the World section shows an `8` badge for a key that does nothing. `ShortcutHint` renders whatever
`hintKey` it is handed and does not consult the binding set, contrary to the claim at
`nav-route-index.ts:66-70` that it "gracefully handles destinations that have no registered `g`
binding (renders no badge)".

## Two related defects in the same area

1. **`g 3` goes to the wrong screen.** `allActions.ts:64` —
   `navAction("go-to-training", "Go to Training", "g 3", { destination: "squad", sectionKey: "3" })`.
   The action is labelled Go to Training and bound to the Training section's key, but navigates to
   **Squad**. `/career/$saveId/training` exists and `NAV_SECTIONS[2].defaultDestination` is
   `"training"`, so this looks like a leftover from the era when sections without routes fell back
   (`nav-config.ts:66-68`).
2. **`CAREER_G_BINDINGS` is a dead second source of truth.** `destinations.ts:187` defines eight
   bindings including `"8" → competitions`, but has no importer anywhere in `src` — only tests and a
   doc comment. The live path is `G_PREFIX_COMPLETIONS` derived from `ALL_ACTIONS`. Two lists that
   disagree, one of which nothing reads.

The docs contradict themselves to match: `nav-config.ts:64` says the navbar "maps positions 1-8"
while `:296` says "Level 0: `1`-`7`".

## The decision this needs

Whether the eighth section should **gain** a working key (add `go-to-world`, lift the `/^[1-7]$/`
cap) or **lose** its badge (have `PrimaryNav` omit `hintKey` where no binding exists) is a design
call about whether every section deserves a shortcut. Answer that first; the code change is small
either way.

## Guard already in place

`test/renderer/navigation/navbar.test.tsx` "badges each section's number key while the level0 prefix
is pending" derives its expectation from the binding registry and is **red on purpose** until this
is fixed. It goes green on its own under either answer. Do not make it pass by re-freezing the
expected list.

- [x] The decision above is recorded
- [x] The navbar advertises a key if and only if that key dispatches
- [x] `g 3` reaches Training, or its label and section key are corrected to match where it goes
- [x] `CAREER_G_BINDINGS` is either wired up as the single source or removed
- [x] `nav-config.ts`'s 1-8 and 1-7 comments agree with the code
- [x] `navbar.test.tsx`'s badge case passes without its expectation being re-frozen

## Answer

**The World section gains a working key, `g 8`.** Its badge stays.

Why: `.agents/notes/implemented/architecture/2026-08-31-career-chrome-and-date-continue-bar.md`
records that every tab stays "reachable by focus and `g <key>` regardless of visibility", and
`.scratch/two-row-nav/spec.md` user story 13 asks for keyboard navigation for every nav item.
Dropping the badge would leave World as the only section with no key, which contradicts a recorded
decision.

What changed:

- The section nav actions in `ALL_ACTIONS` (`allActions.ts`, `sectionNavActions`) are now built
  from `NAV_SECTIONS`: `go-to-<section.id>`, `Go to <label>`, `g <position>`, with
  `destination: defaultDestination`. The action ids for sections 1-7 stay the same, so saved
  binding overrides still apply. This adds `go-to-world` (`g 8` → `competitions`) and fixes
  `go-to-training` (`g 3` → `training`).
- `KeyboardSpine.tsx` used to keep its own copy of the id → destination table, and that copy also
  sent `go-to-training` to `squad`. It now registers handlers from each action's
  `metadata.destination`.
- `KeyboardStateProvider.tsx`: level 0 of the prefix accepts `sectionKeyToEntry.has(k)` instead of
  `/^[1-7]$/`, so the valid section keys come from `NAV_SECTIONS`. A ninth section gets its key
  without another edit.
- `CAREER_G_BINDINGS` is deleted. Its test consumers now read `ALL_ACTIONS`.
