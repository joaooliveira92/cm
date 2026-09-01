# 03: Advanced options model

**What to build:** the advanced-settings model from the spec's "Advanced options ship only where a real system exists" decision — four option categories that tune shipped systems and feed the estimate or a real information policy, so a checkbox can never change nothing:

- **Match-simulation detail**
- **Transfer-market activity**
- **Roster-generation detail**
- **Information visibility**

The model owns which options are legal together and which conflict (advanced-option incompatibilities), and produces the versioned shape the draft later persists. Staff generation and editor/developer capabilities stay recorded as future slots, not modeled here. The setting values feed the ticket-02 estimate so the sidebar's consequence feedback reacts to a changed option the moment it changes.

The slice's edge promise: pure domain plus the payload route — the advanced-options values become a field on the setup state and cross the boundary already validated, exactly like the rest of the selection intents. Failures are checked values, not throws: an unsupported option or an incompatible combination is a validation result the screen renders, never a defect. Callers observe the legal option set and its incompatibility outcomes.

**Blocked by:** 02 — Consequences — entity count, processing cost, and recommendations (options feed the estimate, so the estimate the options tune must exist first).

**Status:** resolved

- [x] Four option categories ship as setup state: match-simulation detail, transfer-market activity, roster-generation detail, and information visibility; each feeds the estimate or a real information policy so no option is a no-op.
- [x] Advanced-option incompatibilities are detected and surfaced as validation results, not throws.
- [x] The option set produces the versioned shape the draft carries; staff generation and editor/developer capabilities are not modeled and remain future slots.
- [x] Pure unit tests cover option application, the incompatibility rules, and the empty/absent-options case, from deterministic fixtures.
- [x] `pnpm check:all` is green at this commit.