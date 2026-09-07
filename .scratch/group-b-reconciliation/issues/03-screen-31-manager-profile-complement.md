# 03 — Screen 31: Manager Profile complement

Type: grilling

## Question

Screen 31 is a near-duplicate of a decision this repo has already made. Group A's ticket 06 redefined
Screen 19 as **Manager Profile**, retired "Manager Status" as a domain term, changed `CONTEXT.md`, and
shipped [ManagerProfileScreen.tsx](../../../apps/desktop/src/renderer/managerProfile/ManagerProfileScreen.tsx)
(227 lines) from it — see
[the Agent Note](../../../.agents/notes/implemented/feature/2026-08-30-manager-profile-screen.md).

So this is a **complement**, in the shape of Group A's ticket 19: cite the existing decision, and add
rows only for what
[31_manager_profile.md](../../../docs/specs/group_b_global_navigation_and_inbox/31_manager_profile.md)
asks for beyond it. Do not re-audit the settled parts.

What screen 31 adds on top: languages, relationships, reputation and familiarity, qualifications,
background, public history, and "authorized actions such as notebook, ownership, resignation, or
retirement". Most of this is expected to be `contradicted` — the identity model is Archetype and
Pillars with no nationality or languages, notebook is out of scope, ownership and resignation are
Group A rulings — but each disposal needs its anchor stated, not assumed.

The one genuinely open piece is **career record and honours**, which screen 31 §2 wants on this
screen. Do not settle it here: it is the subject of ticket 06, which is blocked on this one so that it
decides placement against a profile whose contents are known.

No code changes.

## Done when

- Screen 31 moves off `Not yet audited`, with a status line saying it was read as a complement.
- Every addition beyond Group A's ticket 06 has a row and an anchor.
- The career-record question is handed to ticket 06 unresolved, with this ticket recording what the
  profile does and does not currently hold.
