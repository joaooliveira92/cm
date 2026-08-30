# Documentation and terminology hardening

Status: ready-for-agent

## Summary

The audit found zero terminology violations, but the documentation should be strengthened to
prevent future drift. This ticket covers verifying that the ADR, CONTEXT.md, and Agent Note use
consistent vocabulary and that no `.scratch` ticket or spec uses language implying persistence.

## Acceptance criteria

- ADR-0001 (`docs/adr/0001-derived-player-ratings-and-value.md`) references the Agent Note and
  clearly states the architectural rule from section 1 of the Note
- CONTEXT.md already updated with Current Ability entry and stronger Potential Ability wording
- No `.scratch/*` ticket or spec uses language like "stored rating", "persist the calculated value",
  "rating changed event", "position_weights table"
- A one-time `rg` sweep confirms the terminology audit is complete, documented in the ticket

## Out of scope

- Altering UI-facing copy (e.g. "Overall Rating" is fine to display as-is — this ticket covers
  internal documentation and ticket language only)

## References

- Agent Note: `.agents/notes/proposed/architecture/2026-08-29-player-ratings-are-derived-projections.md`
- ADR-0001: `docs/adr/0001-derived-player-ratings-and-value.md`
- CONTEXT.md: `./CONTEXT.md`