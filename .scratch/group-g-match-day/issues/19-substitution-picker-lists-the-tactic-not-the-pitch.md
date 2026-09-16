# 19: The substitution picker lists the Tactic's players, not who is on the pitch

**What to fix:** `MatchSubstitutionsScreen.tsx` builds its "Player coming off" and "Player coming on"
lists from `ready.tactic`, which is the manager's last live tactic or the pre-match tactic. Once a
revealed forced injury substitution has happened, the injured player is still offered as on the pitch
and the replacement as on the bench. Choosing either makes the engine reject the command ("not on the
pitch" or "not an available substitute"). A red card or a manager bring-off has the same effect.

Found in desktop-suite-red ticket 11 by reading the component. It was not the cause of that ticket's
e2e failure.

Depends on the same revealed-position cut as [ticket 18](18-substitution-count-reads-the-whole-match.md):
the lists must reflect the pitch as of the revealed minute, not the end of the re-simulated match.

**Blocked by:** 18

**Status:** claimed

- [ ] After a revealed forced substitution, red card or bring-off, the picker offers only players on the pitch and unused substitutes
- [ ] A test covers the forced-injury case
