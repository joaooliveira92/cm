# 02: Does this effort migrate existing saves?

Type: grilling
Blocked by: None (can start immediately)
Status: resolved

## Question

The request that opened this effort asks for a versioned, heuristic save migration: convert each
existing player's Position and Familiarity Tier rows into the new representation, deterministically
and idempotently, with before/after fixture saves and inferred values marked as inferred.

That collides with a recorded decision.
[Saves are disposable during development](../../../.agents/notes/implemented/architecture/2026-09-21-saves-are-disposable-during-development.md)
says a save is valid only under the schema it was created with: the version is a hash of the DDL, a
save under any other version is refused on open with `SaveSchemaMismatchError`, and durable saves
with ordered upgrade steps were rejected as premature "until the first release to players". Changing
the `player_positions` or `tactic_slots` check constraints moves that hash by itself, so under the
current rule this change refuses every older save and needs no migration code.

Decide one of:

- **Follow the note.** New saves only; older saves are refused by the existing mechanism. The
  heuristic migration leaves this effort's scope, and the commit touching persistence says it is a
  DDL change that refuses older saves.
- **Overturn the note.** This effort ships the first upgrade step, which means building the ordered
  upgrade path the note deferred (version numbering, a step runner, old-save fixtures) before the
  positional migration itself. Per the repo's rule on overturning recorded decisions, the note is
  superseded in the same change.
- **Something narrower**, such as a one-off conversion tool that is not a general upgrade path.

Agent's recommendation: follow the note. Nobody has a career worth keeping yet, and the old data
holds at most two positions per player, so any conversion would mostly be invented. If the answer is
to follow the note, the migration requirements move to the map's **Out of scope** with that reason.

## Answer

**This effort does not migrate existing saves.** Saves using the ten-value Position and Familiarity
Tier representation are refused under the existing development policy in
[saves are disposable during development](../../../.agents/notes/implemented/architecture/2026-09-21-saves-are-disposable-during-development.md).
An upgrade path stays deferred until saves must survive across player-facing releases.

Consequences for the implementation tickets this effort eventually cuts:

- The DDL change moves `SAVE_SCHEMA_VERSION` by itself (it hashes the DDL), and older saves are
  refused on open with `SaveSchemaMismatchError`. No hand-bumped version, no new mechanism.
- No transformer from Position and Familiarity Tier rows to the new representation, and no upgrade
  infrastructure built for this change alone. Such a transformer would also have to invent line and
  side ratings from data that never held them.
- The persistence ticket and its commit say plainly that the change refuses older saves, as `/gate`
  step 4 asks, and so do release notes if any are written for it.
- Save fixtures and tests move to the new schema. Legacy fixtures are not kept, apart from the
  note's own older-schema fixture, which proves the refusal.

No Agent Note: this reaffirms an existing decision rather than making a new one.
