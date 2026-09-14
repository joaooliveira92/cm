# 04: Tactics/Substitutions UI (97)

**What to build:** UI components for making tactical changes and substitutions during a live match. Backend command journaling (`submitMatchCommand` for ChangeTactics, MakeSubstitution, ForceOff) is already built. This ticket delivers the renderer components that let the manager interact with those commands.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Tactics screen shows current formation and allows adjustments
- [ ] Substitutions screen shows available substitutes and allows changes
- [ ] Commands are submitted via the existing RPC (`submitMatchCommand`)
- [ ] Command status (pending, accepted, applied, rejected) is displayed
- [ ] Substitution cap is respected (existing backend logic)
- [ ] Screen is accessible via the live-match tab navigation
- [ ] Loading and error states are handled