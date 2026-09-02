# 11: World-bound selection record that reaches commitCareer

**What to build:** Choosing a club now means something. The chosen club lives on the creation
session as a record bound to the world it was picked from: `{ clubId, clubName, provisionalId }` or
`null`, where `null` is both first paint — nothing is ever auto-selected — and the state a replaced
world produces. It is written only through one intent-named action that reads the current world's
id itself and records both halves (no-oping outside a ready generation), and read only through one
pure helper that returns `null` on a binding mismatch and never writes the stale record back, so a
club id that belongs to a replaced world can never reach the commit. Continue (`Next: Review`) is
disabled with the stated reason "Choose a club to continue." until a club is picked; the pick
survives stepping back to the Manager step and forward again; the review stage gains a `Club:` row
showing the chosen club's name; and creating the career with an id that matches no club fails
inside the transaction with the existing `ClubNotFoundError`, mapped to "That club is no longer
available. Choose another.", leaving no discoverable save behind. No `temp-club-id` placeholder
remains anywhere in the flow.

The slice's edge: `commitCareer`'s error channel gains the existing `ClubNotFoundError` alongside
`InvalidPillarDistributionError` — a caller can now observe a typed failure for an unknown club id,
and the renderer maps it to the copy above. The selection write is renderer-side session state (no
new RPC method), and the binding read is a pure helper in the renderer's shared create module.

**Decisions:**

- The selection is a record bound to the world it was picked from — `{ clubId, clubName,
  provisionalId }` or `null` — written only through a new `selectClub` on `CreateSessionApi` and
  read only through a `selectedClubOf` helper that returns `null` on a binding mismatch, so a stale
  id cannot reach `commitCareer`. Continue is gated on a pick with a stated reason; the pick
  survives back-navigation; `commitCareer` rejects an unknown id with the existing
  `ClubNotFoundError`; `ReviewPane` gains a club row. See [Agent Note: The club selection is bound
  to the world it was picked from](../../../.agents/notes/implemented/architecture/2026-09-01-club-selection-bound-to-its-world.md).

**Blocked by:** 10 — Two-column workspace in a full-width creation band.

**Status:** ready-for-agent

- [ ] The session carries a `clubSelection` record with `clubId`, `clubName`, and `provisionalId`;
      the only write path is the intent-named action, which records both halves and no-ops outside
      a ready generation.
- [ ] With a club selected, replacing the generation state with a `Ready` carrying a different
      `provisionalId` makes the helper return `null` — asserted directly through the helper, not
      merely through the UI.
- [ ] `Next: Review` is disabled with the stated reason until a club is picked, and enabled after.
- [ ] Stepping back to the Manager step and forward again re-opens on the same club with the panel
      populated.
- [ ] `commitCareer` with an id matching no club fails with `ClubNotFoundError` and leaves the save
      undiscoverable; `ReviewPane` shows the chosen club's name.
- [ ] No `temp-club-id` placeholder survives anywhere in the flow.