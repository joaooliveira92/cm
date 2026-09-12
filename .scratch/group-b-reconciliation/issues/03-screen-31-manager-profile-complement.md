# 03 — Screen 31: Manager Profile complement

Status: resolved

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

## Answer

Screen 31 was read as a complement to Group A's Manager Profile (ticket 06). Every addition beyond that decision was audited and assigned a ledger row:

- **Languages, qualifications, background, relationships, reputation, familiarity** — `contradicted`. The identity model is Archetype and Pillars with no manager-facing side data. Nationality is a player generation input only. (Ledger §1, §4, §6.)
- **Club entity link and contract details** — `contradicted`. The route model has no entity-id routes (Screen 22 §9), and contract/board data belongs to Season Summary. (Ledger §2, §4, §7.)
- **Notebook, ownership, resignation, Manager Status** — `contradicted`. Notebook is Screen 29 disposed; ownership and resignation are inherited Group A rulings; "Manager Status" is a retired term. The one lifecycle action that exists — Retire — is implemented. (Ledger §2, §4, §7.)
- **Tabs (Overview, Career Record, History, Relationships, Contract)** — `contradicted`. Single-view scrolling layout, no tab infrastructure in the contract or the screen. (Ledger §4.)
- **Full `ManagerProfileViewModel` data model** — `contradicted`. The actual contract is deliberately narrow per Group A. (Ledger §6.)
- **Seven distinct screen states** — `contradicted`. Four states from the atom model (Initial/Success/Failure + waiting), with active/archived as display treatments. (Ledger §8.)
- **§16 hidden-attribute rule** — `contradicted`. Silently followed: the manager has no hidden attributes to expose. Resolves the residue the blanket §16 row reserved for this ticket. (Ledger §16.)
- **Portrait/proprietary artwork** — `contradicted`. No portrait slot exists at all. (Ledger §20.)
- **§5, §12-15, §19, §21 (remaining)** — `deferred` as `unscheduled`, matching Screen 22's pattern.
- **§22-23** — `out-of-scope` as import scaffolding.

### Handed off to ticket 06

The career-record question (§2, §4 career stats, §6 careerRecord/honours) is the one genuinely open piece. The profile currently holds nothing of it — no match counts, honours, or career aggregate of any kind — so ticket 06 can decide placement against known contents.
