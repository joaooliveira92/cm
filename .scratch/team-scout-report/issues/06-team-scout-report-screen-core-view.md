# 06: Team Scout Report screen — core view

Type: task

**What to build:** The Team Scout Report screen (screen 49), the first pass showing everything a report contains. The user lands on it aimed at a target club and sees: a header naming the scout, the report's updated date, and its knowledge confidence; the predicted formation and the target's recent form; the strengths and weaknesses findings; the key players (the scouted members, each opening a visible player profile); and the set-piece findings. A tab shell is present — Squad, Tactical View, Previous Reports, Assign Scout — with the non-first-pass tabs present but disabled and labelled as not yet available. An action opens the upcoming fixture against the target club.

The screen distinguishes the seven view states — loading, ready, refreshing, empty, filtered_empty, permission_limited, unavailable, error — and preserves the last valid view during a recoverable refresh failure (spec §10). Unknown information stays Unknown on screen; hidden exact attributes never surface through prose or sorting. Back and keyboard/assistive-technology access come from the shell's shared controls; asynchronous requests are cancellable so a late response from a prior club or revision is discarded. All text renders as text, never as untrusted structured content.

**Blocked by:** 05 (the club-scoped route and shell entry).

**Status:** claimed

- [ ] Reading the report for a scouted target shows header (scout, updated date, knowledge confidence), formation, recent form, strengths, weaknesses, key players, and set-piece findings.
- [ ] The tab shell renders Squad, Tactical View, Previous Reports, and Assign Scout; non-first-pass tabs show an explicit not-yet-available state rather than functioning.
- [ ] Opening the upcoming fixture against the target from the report navigates to that fixture.
- [ ] The screen distinguishes loading, ready, empty, permission-limited, unavailable, and error states — each as its own distinguishable view, never color alone.
- [ ] A late asynchronous response from a previously viewed club is discarded (stale-response test).
- [ ] No hidden exact attribute of a below-Fully-Scouted player renders anywhere on the screen.
- [ ] Keyboard-only and assistive-technology users can reach every visible information item and action.
- [ ] Focus returns to the entry point after navigating back from the report.