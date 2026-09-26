# 01: What a President and a Physio are

Type: grilling
Blocked by: None (can start immediately)
Status: resolved

## Question

The role set is closed at four and two of them are new. This ticket decides what a **President** and
a **Physio** actually consist of as generated data, which is the smallest surface any of them has
ever had: a name, a role, and nothing else.

Settle:

- **The seed.** `deriveSeed(worldSeed, "presence", clubId)` is the shape charting assumed. Confirm
  the discriminator string and that one stream serves both people, or split them.
- **Names.** Bound staff draw from `NAME_POOLS[clubNation]`, the same machinery players use, and
  the existing note argues that routing generated fiction through a Content Pack protects a licence
  nobody holds. Confirm that inheritance and settle whether a President's nationality follows the
  club's nation the way a coach's does, or draws more widely — a club's president being foreign is
  ordinary in a way its physio being foreign is not.
- **Whether anything varies by Stature Tier.** Bound staff draw a quality band from it. A presence
  person has no number, so the only candidates are name-pool weighting or a role title that differs
  by tier, and it is genuinely open whether either is worth having. The map's fog carries this as an
  open doubt rather than an assumed yes.
- **The type.** A presence role is not a `StaffRole`: the `staff_role` check constraint permits
  exactly `coach` and `scout`, and it must keep saying so. Name the second role union and the record
  the derivation returns.

The `CONTEXT.md` entries for **President** and **Physio** are written as part of resolving this, per
the domain-modeling skill's update-inline rule — including the `_Avoid_` line keeping President
distinct from Chairman, Owner, and the Board itself.

## Answer

**A Presence Staff member is a name and a role, derived per-role from the World Seed and the club id,
domestic, invariant across Stature Tier, and never stored.** See
[Agent Note](../../../.agents/notes/implemented/feature/2026-09-07-presence-staff-are-derived-never-stored.md).
