# 04: Tactics/Substitutions UI (97)

**What to build:** UI components for making tactical changes and substitutions during a live match. Backend command journaling (`submitMatchCommand` for ChangeTactics, MakeSubstitution, ForceOff) is already built. This ticket delivers the renderer components that let the manager interact with those commands.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Tactics screen shows current formation and allows adjustments
- [x] Substitutions screen shows available substitutes and allows changes
- [x] Commands are submitted via the existing RPC (`submitMatchCommand`)
- [x] Command status (pending, accepted, applied, rejected) is displayed
- [x] Substitution cap is respected (existing backend logic)
- [ ] Screen is accessible via the live-match tab navigation — not met as written; see Comments
- [x] Loading and error states are handled

## Comments

**Shipped (2026-09-14).** `MatchMatchTacticsScreen` and `MatchSubstitutionsScreen` replace the stubs,
sharing `match/useLiveMatchCommands.ts` and `match/LiveCommandFrame.tsx`. Status is resolved by
`match/commandStatus.ts`: the backend journals every command and the engine drops invalid ones
silently, so a substitution reads `applied` only when the response's whole-match substitution count
rises, and a tactics change reads `accepted`. Formation stays fixed live, matching the Match day panel;
adjustments are the three Team Instructions.

**Reachability.** The live-match tab bar (`SecondaryNav`) is mounted nowhere in the app, so the tab
criterion cannot hold. The screens are reached from buttons on the live Match day section (new
destinations `matchMatchTactics`, `matchSubstitutions`) and link back. Mounting the tab bar is
[ticket 13](13-mount-live-match-tab-bar.md).

**Review.** First pass NEEDS_REWORK: the score and head-count came from the first chunk of a cursor-0
read, and the panel and screens kept separate tactics, so a tactics change could undo a substitution.
Repaired: the score is the one Match day has revealed (`session.ts`), the head-count line is gone, and
the panel and screens share the last live tactic. The halftime toggle is limited to half time. Second
pass APPROVE.

**Known limitations.** A live `ChangeTactics` rebuilds the whole line-up in the engine and can return a
dismissed player: [decision request 01](../decision-request-01-live-change-tactics-scope.md). The Match
day panel commands the home club even when the controlled club is away, and writes the shared tactic
before its commands resolve: [ticket 12](12-live-panel-controlled-club.md). Screen 97's revision-bound
idempotent commands (§9) have no backend request id; a double press is guarded client-side only.

