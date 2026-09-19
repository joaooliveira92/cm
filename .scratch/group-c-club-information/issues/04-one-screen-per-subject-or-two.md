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

- [ ] A stated rule covering all twelve, with its exceptions named and reasoned
- [ ] Each exception says what the manager may *not* see of another club, and what decides that
- [ ] The rule is written as an Agent Note, not only as a ticket answer
- [ ] It says explicitly whether `clubInfo`/`clubInformation` and `finances`/`clubFinancesDetail` are
      one screen or two, since those are the two live duplications

**Blocked by:** [03](03-screen-inventory-and-the-stale-49-row.md) — the exceptions turn on which
screens have a model at all, and the survey is what says so.

Status: ready-for-agent
