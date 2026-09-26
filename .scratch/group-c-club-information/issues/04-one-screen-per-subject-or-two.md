# 04: Does a Group C screen exist once, or once per club-you-are-looking-at?

Type: grilling

The question the whole group turns on, and the reason it is a decision ticket rather than twelve
independent judgement calls made under deadline.

## The situation

The renderer carries two parallel families:

- **Save-scoped nav destinations** — `clubInfo`, `finances`, `boardConfidence`, `clubHistory`,
  reached from the Club section with only a `saveId`, and implicitly about *my* club.
- **Club-scoped drill-downs** at `club/$clubId/…` — `clubInformation`, `clubFinancesDetail`,
  `clubHistoryDetail`, `clubSquadDetail`, `clubReservesDetail`, `clubYouthDetail`,
  `clubFixturesDetail`, `clubTransfersDetail`, `clubCompetitionsDetail` — about *any* club.

So several import screens have two placeholders. The import has no opinion, because it was written
for a game where a club screen is a club screen.

## The precedent, and why it is not automatically the answer

Screen 38 Club Staff exists **once**, club-scoped, and its nav entry is a thin own-club resolver over
the same screen ([ticket 02](02-the-club-staff-nav-entry-lands-on-a-placeholder.md)).
`destinations.ts` explains the mechanism: a drill-down needs a target club, so it cannot be a
save-scoped nav destination, and `squadAtom(saveId).club.id` resolves the own club.

Test it rather than inherit it. Staff is the easiest possible case — a club's staff list reads the
same whoever is looking. The cases that might not:

- **39 Finances.** A manager sees their own budgets; what they see of a rival's is a scouting
  question, not a formatting one. One screen with hidden fields is a different design from two
  screens, and the difference is about information the player is *allowed* to have.
- **47 Board Confidence.** Board Objective is the manager's relationship with their own board. A
  rival's board confidence may have no referent at all rather than a hidden one.
- **35/36/37 Squads.** The own-club Squad screen is shipped and is interactive — selection, sorting,
  drill-down. An any-club squad is a read. Those may genuinely be two screens.

## What to settle

A rule that decides all twelve, plus its stated exceptions. Something of the shape: *one screen per
subject, club-scoped, with an own-club resolver for any nav entry — except where what the manager may
see differs by whose club it is, in which case say what governs that and why it is not simply hidden
fields.*

Record it as an Agent Note, because it will be quoted by Group L (nations and competitions have the
same shape) and by whoever finally builds these.

## Acceptance

- [x] A stated rule covering all twelve, with its exceptions named and reasoned
- [x] Each exception says what the manager may *not* see of another club, and what decides that
- [x] The rule is written as an Agent Note, not only as a ticket answer
- [x] It says explicitly whether `clubInfo`/`clubInformation` and `finances`/`clubFinancesDetail` are
      one screen or two, since those are the two live duplications

**Blocked by:** [03](03-screen-inventory-and-the-stale-49-row.md) — the exceptions turn on which
screens have a model at all, and the survey is what says so.

Status: resolved

## Answer

**A Group C screen is club-scoped and exists once. A nav entry for it is a thin own-club resolver
over that one screen. The exception is subject existence, not visibility.**

Note: [a club screen is club-scoped unless only your club has one](../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).

### The ticket's framing was wrong, and usefully so

It asked what the manager *may not see* of another club, expecting the exceptions to be about
information. `CONTEXT.md` closes that off: **"A Club never carries a hidden value of its own for an
Attribute Range to narrow"** — uncertainty in this game lives at the Player level, through Scouting
Progress, and there is no club-level fog mechanism at all. Screen 38 already shows any club's staff
to anyone who navigates to it.

So "one screen with hidden fields" is a design this game has no machinery for, and the whole
information axis the ticket worried about is empty.

### What the exception actually is

Whether the subject exists for a rival club at all — and that is a schema question with a crisp
answer rather than a judgement call:

- `club_budgets` is keyed on `club_id`, **one row per club**. Every club has budgets → Screen 39 is
  club-scoped.
- `board_objective` is keyed on `season_number`, **one row per season**, carrying the human club's
  id. A rival club has no Board Objective *at all* → Screen 47 is save-scoped and should never
  acquire a `club/$clubId/board-confidence` route.

A primary key decides it. That is why the rule can settle twelve screens without twelve arguments.

### The two live duplications

- **Screen 34** — one screen. `clubInformation/` stays, `clubInfo/` goes, nav entry resolves the own
  club. Both currently carry `aria-label="Club Information"`, which is the duplication announcing
  itself.
- **Screen 39** — one screen. `clubFinancesDetail/` stays, `finances/` goes, same resolver.

### The trap the rule avoids

An interactive own-club screen is **not** a second screen. The shipped `squad/` sorts, selects and
drills down; an any-club squad is a read. That is a difference in *capability*, and the resolver
handles it — same screen, affordances gated on whose club it is, exactly as `ClubStaffScreen`
already marks a club that is not the user's. Two screens for that reason would be two
implementations of one list, which is how the pair for Screen 34 came to exist.

### Wider than this group

Group L has the same shape for nations and competitions. The discriminator generalises: ask whether
the subject has a row for the thing you are looking at. Quote the note rather than re-deriving it.
