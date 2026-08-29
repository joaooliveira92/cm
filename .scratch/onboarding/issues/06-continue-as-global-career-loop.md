# 06: Continue as global shell control + readiness display

**What to build:** Move Continue from `LeagueTableScreen` into the shared application shell (`App.tsx`), available from every primary management screen. The player-facing label is "Continue"; the save-list "Continue career" is renamed to "Load". Each of the six `AdvanceCalendarResult` fields interrupts, with one press rendering one structured durable result surface (what happened → what is next → what is unresolved → what you can do). The result persists until acknowledged; no read/unread state, no chronological history. Match readiness is a persistent derived state displayed in the shell, never dismissible, that blocks crossing the match boundary but never blocks advancement before it. Space keyboard shortcut activates Continue where safe (not in text fields, not while a result is open, not while advancing). The control has five states (idle, advancing, stopped_with_result, blocked_before_match, unavailable). A nullable pre-match boundary field is added to `AdvanceCalendarResult` carrying the pending fixture and typed readiness blockers.

**Decisions:**

- Continue becomes a persistent application-shell control, keeps its label, stops at every boundary `AdvanceCalendarResult` can report, renders one structured durable result per press, and refuses to cross into the human's match with invalid or absent required setup while never blocking advancement before that boundary. See [Agent Note](../../../.agents/notes/proposed/feature/2026-08-29-continue-as-global-career-loop.md).
- No inbox, no news screen, no message feed in v1. The v1 screen list stays at six. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-08-29-no-onboarding-inbox.md).

**Blocked by:** 02 (needs clean `advanceCalendar` boundary), 05 (needs shell identity + save-list rename)

**Status:** ready-for-agent

- [ ] Continue visible from every primary management screen, owned by app shell, no longer in `LeagueTableScreen`
- [ ] Player-facing label is "Continue"; `advanceCalendar` stays the operation name; save-list "Continue career" renamed
- [ ] Six `AdvanceCalendarResult` fields each interrupt; single advance's consequences in one structured surface
- [ ] Result surface persists until acknowledged; no transient toast, no read/unread, no chronological history, no inbox semantics
- [ ] Result order: what happened → what is next → what is unresolved → what you can do
- [ ] Nullable pre-match boundary field on `AdvanceCalendarResult` (pending fixture, matchday, opponent, home/away, typed readiness blockers)
- [ ] Renderer never infers boundary arrival from route, fixture lookup, null-Tactic check, or before-and-after comparison
- [ ] Unavailable state always states its reason; disabled button never silent
- [ ] Space activates Continue where global shortcut is safe; never while typing, in focused selection control, while result is open, or while advancing
- [ ] Duplicate Continue requests prevented
- [ ] Match readiness visible for as long as unresolved; never dismissible
- [ ] Missing preparation blocks crossing into the match but never blocks advancement before the boundary
- [ ] Tests: boundaries interrupt correctly, readiness persists, shell state model transitions at main-process seam