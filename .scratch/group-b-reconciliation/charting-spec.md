# Group B Reconciliation — Charting Spec

Status: ready-for-agent

**Scope of this document.** This is the spec for the Group B reconciliation *effort*: its destination,
its method, and the rulings settled at charting before any ticket opened. It is **not** the Group B
screens spec. That document is `spec.md` beside this one, produced by
[07 — Assemble the Group B spec and register](issues/07-assemble-spec-and-register.md) once the six
audit tickets resolve, and it states per screen what the implementation must do. Nothing here
pre-empts an audit finding, because at the time of writing no audit had been run.

## Problem Statement

Eleven imported specifications sit in
[docs/specs/group_b_global_navigation_and_inbox/](../../docs/specs/group_b_global_navigation_and_inbox/)
describing a global application shell, a news inbox, a calendar, a notebook, manager history and
profile screens, and a multiplayer chat. They are an import, not a set of requirements: all eleven are
the same generated 24-section template, roughly 2,400 lines and 260 sections in total, and they
routinely describe subsystems this project has never decided to build.

Ten of the eleven screens are marked `Not yet audited`, which the ledger's own legend says asserts
nothing at all. So today nobody can tell, for any of those screens, whether the codebase agrees with
the import, contradicts it, or has simply never considered it. The gap is invisible rather than
recorded, and every future session that opens one of these files re-derives the same disposals from
scratch.

Group A solved the identical problem for its 21 screens and left the method behind, but explicitly
ruled widening that map to other groups out of scope: applying it to Group B is a fresh effort, not a
resumption.

## Solution

Chart Group B as a wayfinder map whose destination is a `spec.md` covering all eleven screens plus a
completed reconciliation ledger with no screen left at `Not yet audited`, ready to hand to
`/to-spec` → `/to-tickets`.

The method is Group A's, applied second: the import is a checklist to reconcile against, not a
contract to satisfy; where the import and the codebase disagree, the codebase's existing decisions win
unless a ticket explicitly overturns them; and every disagreement becomes a ledger row with a
mandatory anchor rather than a silent drop. Sections followed as written get no row, and that silence
means something only under an `Audited` or `Reviewed` status line.

Where Group A had to invent the ledger format and settle the decision-record layer first, Group B
inherits both, along with five scope rulings. Its work is therefore audit rather than groundwork,
which is why the map is seven tickets rather than twenty.

## User Stories

1. As a maintainer opening any Group B import file, I want its ledger status line to tell me whether anyone has read it, so that I know whether silence means "followed" or "unknown".
2. As a maintainer, I want every divergence between the import and the codebase recorded with an anchor, so that a disposal is a citation rather than an unsupported assertion.
3. As a maintainer, I want the import files left unedited, so that I can always see exactly what arrived.
4. As an agent session picking up a Group B ticket, I want the map's Notes to name the inherited rulings, so that I cite the multiplayer and worker-pool disposals instead of re-arguing them.
5. As an agent session, I want each ticket sized to one context window, so that I can resolve it without running out of room mid-audit.
6. As an agent session, I want blocked tickets marked as blocked, so that I do not audit the same code twice from two different tickets.
7. As a human driving the map, I want the frontier visible without opening every ticket, so that I can see what is takeable now.
8. As a human driving the map, I want unblocked tickets runnable in parallel, so that four audits can proceed at once.
9. As a maintainer, I want screens ruled out of scope at charting to still get ledger rows, so that a whole-file disposal is recorded rather than assumed from an absent row.
10. As a maintainer, I want out-of-scope rulings to state what would have to change for them to return, so that a scope boundary is auditable rather than permanent by default.
11. As a maintainer, I want the three news specs audited together, so that one model of the news screen is derived once rather than three times.
12. As a maintainer, I want Screen 31 read as a complement to the Manager Profile decision already recorded, so that a settled screen is not re-litigated.
13. As a maintainer, I want Screen 23 carried by citation, so that a screen already `Reviewed` with two implemented Agent Notes is not re-opened.
14. As a maintainer, I want the effort to produce decisions rather than code changes, so that fixes are sequenced through `/to-tickets` with the full audit in view.
15. As a maintainer, I want audit findings about live code recorded as ledger rows rather than fixed in passing, so that a bug found mid-audit is not silently repaired without a ticket.
16. As a player, I want the Calendar's existence settled before its content is audited, so that the game does not acquire a screen duplicating one it already has.
17. As a player, I want the question behind Manager History asked in this game's terms, so that a screen is judged on whether a Save accumulates a career record rather than on an import's assumption of many clubs.
18. As a player, I want vocabulary added to `CONTEXT.md` when a screen's subject has no term, so that the glossary keeps pace with the decisions.
19. As a player, I want no Manager Notebook, so that the game does not acquire a private note-taking surface nothing in it asks for.
20. As a player, I want no manager chat, so that a single-player game does not ship a channel with nobody on the other end.
21. As an agent session resolving a note-worthy ticket, I want the Agent Note written atomically with the resolution, so that the rationale is not deferred to a pass that never happens.
22. As a maintainer, I want the map's fog section to name what is coming but not yet sharp, so that the effort's direction is readable before its tickets exist.

## Implementation Decisions

Every decision below was settled at charting, on 2026-09-07, before any ticket opened. None came from
a resolved ticket, so none carries a note gist or link: per `cm-wayfinder`'s note-worthiness test,
scoping calls and method choices of this kind are stated in plain prose.

- The destination is a `spec.md` covering all eleven Group B screens plus a completed reconciliation ledger with no screen at `Not yet audited`, handed to `/to-spec` → `/to-tickets`. This repeats the Group A shape rather than letting each screen spawn its own effort, because the ledger is already seeded in that format and Group B is roughly a tenth of Group A's size, so a single spec will not collapse under it.

- The effort plans and does not execute, with no exception. Group A allowed itself one execution ticket because a documentation repair was holding `pnpm check:all` red for every subsequent session; Group B has no equivalent, and screens 22, 24–26 and 31 have live code an audit will find bugs in. Those findings become ledger rows and spec statements; the fixes go through `/to-tickets` afterwards with the whole audit visible.

- Screen 32, Manager Chat and Multiplayer Communication, is out of scope in full, ruled at charting with no ticket. The file is entirely the multiplayer, network and multi-manager axis Group A removed wholesale, and there is exactly one human manager per Save, so there is nobody to communicate with. Its whole-file disposal is written into the ledger by the assembly ticket so the silence is recorded rather than inferred from an absent row.

- Screen 29, Manager Notebook, is out of scope in full, ruled at charting with no ticket. Manager-private notes, tags, pinning, entity-linked annotations and note-to-reminder conversion have no referent in the codebase, in `CONTEXT.md`, or in any recorded decision, and nothing in the game asks the player to keep private prose; the screen additionally takes the multi-manager privacy model as its premise. Ledger row written by the assembly ticket.

- Screens 24, 25 and 26 are audited as one ticket rather than three. They are three specs over one implementation — a single news screen carrying the list, the filters and the message pane across roughly 476 lines — so splitting them would make three sessions re-read the same code and re-derive the same model. Each screen still gets its own ledger status line.

- Screen 31 is audited as a thin complement, not a fresh audit. Group A's Screen 19 ticket already redefined this screen as Manager Profile, retired "Manager Status" as a domain term, changed `CONTEXT.md`, and shipped the implementation. The complement cites that decision and adds rows only for what Screen 31 asks beyond it — languages, relationships, reputation, qualifications, background, public history — most of which is expected to be contradicted by the Archetype-and-Pillars identity model, though each disposal states its anchor rather than assuming it.

- Screen 22 gets its own full audit ticket and is not folded into Group A's shell audit. Group A audited the pre-career boot shell, Main Menu then Load Career; Screen 22 is the career chrome that every career screen renders inside, roughly 700 lines across nine files. They are different surfaces, and the chrome is the densest audit in the group because navigation history, focus restoration and the Continue control all live in it.

- Screen 22's audit establishes a single disposal for the phrases "prior safe screen", "career revision" and "permission context", which recur in section 3 and section 9 of every file in the group. Later tickets cite that disposal rather than re-deriving it, so the recurring clause is dealt with once.

- Screen 27 is a disposal ticket rather than a charting ruling, unlike screens 29 and 32. Its worker pools and memory budgets are out of scope by inheritance, and its advance dialog, progress UI, task checklist and cancellation are already disposed of on Screen 23's rows, but a residue may survive: the failure path when an advance fails, which the continue-and-advance-time effort records as currently silent outside the League table, plus local structured logging, which remains explicitly in scope. A session confirms the residue is empty rather than assuming it.

- Screen 27 is blocked on the Screen 22 audit, because the Continue control and its result rendering live in the career chrome and auditing them from two tickets would produce two sets of rows over the same code.

- Screen 28 is reframed to ask whether the Calendar is a screen at all before auditing its content. `CONTEXT.md` has a Season and calendar section, so Calendar is domain vocabulary rather than an import invention, but the only implemented surface near it is Fixtures, and the Continue control already takes the player to the next scheduled event, which is most of what a player consults a calendar for. The answer — internal structure, existing screen under another name, or a genuinely missing surface — decides whether the import's month views, filters and reminders are classified as contradicted or deferred.

- Screen 28 is a grilling ticket, not a prototype ticket. Drawing a calendar layout before knowing whether the screen exists would prototype a surface that may not survive the question; a prototype ticket is raised later only if the conversation settles that it exists and then stalls on what it looks like.

- Screen 30 is reframed from "audit Manager History" to "does a Save accumulate a season-by-season career record, and is that a screen or a section of Manager Profile". Taken literally the import does not apply, because this game has one club per Save and resignation and the job market are Group A rulings deferred to Group N, leaving exactly one appointment on the timeline. Dismissing the screen on that basis would dismiss a real question with it: whether final league positions, honours, tenure length and the sacking or retirement that ended a career survive a season rollover in queryable form, and whether Season Summary already is this screen for the only season that has one.

- Screen 30 is blocked on the Screen 31 complement, so that the "or a section of Manager Profile" half of its question is decided against a profile whose contents are known rather than assumed.

- Screen 23 is carried by citation and not re-opened. It is already `Reviewed` in the ledger, its design lives in two implemented Agent Notes rather than in the import, and its remaining work is execution owned by the separate continue-and-advance-time effort. The spec states its requirements from those notes.

- Five scope rulings are inherited from Group A and cited rather than re-argued: the multiplayer, network and multi-manager axis, which consumes section 10 of all eleven files; worker pools, memory budgets and resource-policy tuning; off-device telemetry, crash reporting and analytics, with local structured logging unaffected; non-normative import scaffolding, which is three sections per file and thirty-three across the group; and resignation with the unemployed-manager job market, which belongs to Group N.

- The map carries no research tickets. Every question in it is answerable from this repository, so nothing waits on external documentation and no ticket can be resolved by a background agent working alone.

- Navigation placement for any new surface is deliberately left in the map's fog rather than ticketed. If the Calendar question or the career-record question produces a screen, it needs a navbar slot, a keyboard tier and a command-palette decision — the shape Group A's navigation ticket took — but that question cannot be phrased sharply until it is known whether either screen exists.

## Testing Decisions

This effort produces documents, not code, so it has no unit tests. What stands in for them is the
repo's existing documentation gates, and the discipline that a good check here observes the artifact's
external state rather than the process that produced it.

- The single seam is the reconciliation ledger. Every audit ticket writes through it, and the Coverage table's status lines are the observable state: the effort is done when no row reads `Not yet audited`. Checking the table is checking the work, without opening a ticket or inspecting how any session reached its conclusion.

- `verify-md-links` is the mechanical gate. The ledger and the map are dense with relative links into `.agents/notes/`, `CONTEXT.md` and the import files, and a disposal whose anchor does not resolve is an unsupported assertion. This gate already runs in `pnpm check:all`. Prior art: it is the gate that catches exactly this class of error across the existing Group A ledger.

- Anchor presence is checked by reading, not tooling. Every row carries a mandatory anchor whose meaning is set by the row's Kind, and no script enforces that today; `docs/agents/notes.md` fixes prose-only enforcement for v1, so this is a review obligation rather than a gate.

- No test asserts the content of a disposal. Whether a section is `contradicted` rather than `deferred` is a judgment recorded with its reasoning, and a test that pinned it would only restate the ledger.

- The Group A ledger is the prior art for the whole format, and is the fuller worked example a Group B session reads before writing its first row.

## Out of Scope

- **The Group B screens spec itself.** It is this map's destination, not this document, and it is produced by the assembly ticket once the six audits resolve. Writing it now would mean inventing findings for screens nobody has read.
- **Screen 32 and Screen 29 in full**, per the rulings above.
- **Screen 23's remaining execution**, owned by the continue-and-advance-time effort.
- **Any code change.** The effort plans; fixes are sequenced afterwards through `/to-tickets`.
- **The five axes inherited from Group A**, listed under Implementation Decisions.
- **The other seventeen spec groups.** Group A was the pilot and Group B is the method's second application; widening further is a different effort.
- **Editing the import files.** Their value is that what arrived stays visible.

## Further Notes

The map is deliberately incomplete. Three patches sit in its Not-yet-specified section — navigation
placement for any new surface, the News Message taxonomy, and whether navigation history and focus
restoration warrant their own design decision — each in scope but not yet sharp enough to state as a
question. They graduate into tickets as the audits that clear them resolve.

Two facts about the working tree at charting time, neither caused by this effort: `verify-md-links`
reports four broken links in the presence-staff Agent Note, which is a parallel session's in-flight
work, and one missing image reference in the Screen 23 import file. Group B's own links verify clean.
