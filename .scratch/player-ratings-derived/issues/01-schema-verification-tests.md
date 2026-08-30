# Schema-level verification tests

Status: ready-for-agent

## Summary

Add tests that verify no derived rating columns exist in the `players` table schema, no
`position_weights` table was created, and Potential Ability is the only hidden scalar stored.

## Acceptance criteria

- A schema test asserting `players` table columns match the known attribute list (no
  `overall_rating`, `position_rating`, `transfer_value`, `current_ability`)
- A schema test asserting no `position_weights` table exists in the SQLite schema
- A schema test asserting `potential_ability` column exists on `players`
- Tests run as part of the CI gate (`pnpm check:all`)
- Test is simple string/SQL matching on `createSchema`'s DDL or on an introspection query

## Rationale

The architectural rule is already followed in production code; these tests make it mechanically
enforced going forward.

## References

- Agent Note: `.agents/notes/proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md`
- Schema: `apps/desktop/src/main/schema.ts`