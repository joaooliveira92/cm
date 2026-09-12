# 01 — Screen 22: audit the career chrome

Type: grilling
Status: resolved

## Question

Audit [22_global_application_shell.md](../../../docs/specs/group_b_global_navigation_and_inbox/22_global_application_shell.md)
against the career chrome and produce its ledger rows.

The import's "Global Application Shell" is **not** the shell Group A's ticket 04 audited. That one was
the pre-career boot shell — Main Menu, then Load Career. This one is the chrome every career screen
renders inside: [CareerChrome.tsx](../../../apps/desktop/src/renderer/chrome/CareerChrome.tsx) (350
lines) plus `header/` (six components), `bottom-bar/`, and the two Continue components. Around 700
lines across nine files, and the only surface shared by all of Group B.

State plainly which sections the chrome follows, which it contradicts, and which are absent-but-wanted.
The dense areas, where the import is most likely to describe machinery this game does not have:

- **Navigation history and the "prior safe screen"**, a phrase every file in this group repeats. What
  the router actually does on back, and whether "safe" means anything here.
- **Focus restoration across route changes** — `RouteView` claims a semantic focus identity per screen;
  does the behaviour match what §12 asks for.
- **The Continue control**, which lives in this chrome. Screen 23's ledger already disposed of the
  advance *dialog*; this ticket covers the control's presence in the chrome, not the advance itself.
- **Header search and the command palette** — `HeaderSearch.tsx` exists; the import's model may not be it.
- **Career revision and permission context**, threaded through §3 and §9 of every file. With one manager
  and durable-at-commit persistence, establish once here what these dispose to, so the later tickets cite
  this row rather than re-deriving it.

No code changes. Findings are ledger rows plus spec statements.

## Done when

- Screen 22's ledger status moves from `Not yet audited` to `Reviewed` or `Audited`, and the ticket says
  which and why.
- Every material divergence has a row with a mandatory anchor.
- The "prior safe screen", "career revision", and "permission context" phrases have a single disposal
  the remaining tickets can cite.

## Answer

Screen 22 is **`Reviewed`**, not `Audited`, and the line falls in a specific place. All 23 import
sections were read and each is now either on a row, on one of the three blanket rows, or followed as
written. What was not done is the behavioural half: §12's announcement and colour-alone rules, and
§20 criterion 5's promise that an unread count updates without resetting focus, are runtime claims that
need the chrome driven rather than read. Those are what an `Audited` pass would have to settle.

Thirteen rows, the material ones being:

- **"Prior safe screen" disposes to "the previous screen"**, and the row says so in terms the rest of
  Group B can cite. Back and Forward are the router's own history with no filtering. Safety filtering
  presupposes a stack entry can go stale, and none can: every career destination is
  `/career/$saveId/<section>`, parameterised by the Save and nothing else. The same fact disposes of
  the deleted-entity fallback, §19's stale-selection edge cases, and §20 criterion 7 — no route names
  an entity, so nothing can dangle.
- **"Career revision" and "permission context" were already settled** by the blanket multiplayer sweep
  that ran immediately before this ticket, under *The multiplayer axis* in the ledger. This ticket did
  not re-derive them; the third of the ticket's three phrases was the only one outstanding.
- **`GlobalShellState` does not exist and should not.** The chrome composes five independently-failing
  reads plus the scope state it publishes itself, and `primaryDestinations` is a compile-time constant
  rather than data. That is why the header renders per-metric placeholders instead of one frame-wide
  loading state.
- **Two genuine gaps, recorded as `deferred` rather than dressed up.** A failed header read is
  indistinguishable from one still in flight — both render the same `NO_VALUE` placeholder, and there
  is no Retry in the frame; the advance path, which reports its error properly in the result band,
  shows the shape the rest should take. And route-level focus restoration stops one level short of its
  own documented contract: `BACK_RESTORE_MARKER` resolves to the screen wrapper, nothing records a
  per-screen main region, so back navigation lands on the screen rather than where the player left.
  The proposed intra-screen focus model owns that level and is unbuilt.
- **The bottom status bar, breadcrumbs, and global search are each contradicted, for different
  reasons.** There is no bottom bar: save has no state to report under durable-at-commit, network is
  the disposed axis, and processing is reported beside the control that causes it. Breadcrumbs would
  carry at most two entries in a two-level nav model. `HeaderSearch` sits where the import puts search
  but opens the command palette — the Action registry is the only searchable surface this application
  has.

Navigation gaps recorded as `deferred`: staff, finances and scouting have no destination; Training has
its navbar slot and no screen.
