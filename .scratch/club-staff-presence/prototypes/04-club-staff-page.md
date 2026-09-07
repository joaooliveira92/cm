# Prototype: the Club Staff page (ticket 04)

A throwaway wireframe to settle the layout, the row contents, the surviving states, the
whose-club marker, and the reading order. The real screen is built to this and nothing more; what
changes in build is rendering detail, not structure.

```text
┌──────────────────────────────────────────────────────────────┐
│ NORTH UNITED · Club Staff                    [Not your club] │  ← club header, <main> label
│                                                              │
│ Executive                                                    │  ← h2, aria-labelled list
│   President        Alan Reyes                                 │
│ Coaching                                                     │
│   Coach            Diane Wax                                  │
│ Recruitment                                                 │
│   Scout (1 of 4)   Marcus Ito                                 │
│   Scout (2 of 4)   Elena Suarez                               │
│   Scout (3 of 4)   Peter Olsson                               │
│   Scout (4 of 4)   Miriam Koval                               │
│ Medical                                                      │
│   Physio           Thomas Bayard                              │
└──────────────────────────────────────────────────────────────┘
```

For the manager's own club the `[Not your club]` marker is absent: every other screen in the app is
implicitly yours, so neutrality is the home-club default and the foreign marker — the novel case —
is the one that must be loud.

## States

| State | When | What the page shows |
|---|---|---|
| `loading` | The `getClubStaff` RPC is in flight. | The club header renders nothing; the list area shows a loading row. |
| `ready` | The RPC returned. | The four groups above, in fixed department order. |
| `error` | The RPC failed: save missing, or the `$clubId` names no club in this save. | A single error line stating the club could not be found, on the standard error surface. |

`permission_limited`, `refreshing`, `empty`, `filtered_empty`, and `unavailable` do not exist and
are not future hooks: this app has one manager and no permission model; the read is one immutable
query re-run on navigation, never refreshed in place; and a club that exists in the save is always
derivable, so an unreachable club *is* the error state, not a fourth one.

## Reading order and regions

- `<main>` labelled by the club heading — the first thing an assistive user hears is which club's
  staff this is, and "not your club" when that is true.
- Four `<h2>` groups in fixed order Executive → Coaching → Recruitment → Medical, each a labelled
  list. Rows sit in DOM order under their heading.
- Rows are not focusable: the page is a terminal links-nowhere list, so the focusable things are
  the entry point that brought you here and `g b` that leaves. Keyboard arrival lands on the club
  header (the screen's main region via `requestFocus({ screen: "clubStaff" })`).

## Open questions the build owns

- Whether the "1 of 4" scout numbering survives — it exists only because Recruitment is the one
  department with more than one person, and it may read as clutter.
- Exact accessible-list markup for the groups (the squad screen's table patterns are the
  reference).