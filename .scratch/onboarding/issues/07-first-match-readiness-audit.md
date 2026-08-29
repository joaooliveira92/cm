# Audit: what a brand-new save already has set

Type: task
Status: open

## Question

Fact-finding, AFK, no decision. The seed doc singles out **useful defaults** as one of 03/04's
genuine strengths: the player could reach the first match without redesigning training, replacing
staff, or mastering transfers. Whether a fresh save in this codebase satisfies that is currently
unverified, and several downstream tickets are guessing without it.

Create a save through the existing flow and establish, concretely:

- Does the human's club have a **tactic** set at creation, or is it null? `main/tactics.ts` notes
  that `season.ts` synthesizes a default for *AI* clubs "without one" — determine what the human's
  club gets, and what the Tactics screen shows on first open.
- Is there a **legal starting XI** selected, or must the player pick one before the first match can
  be played? What happens on `startMatch` if nothing is set?
- Is **Training Focus** defaulted per player? CONTEXT.md says it is "always set (defaults to
  none/balanced)" for a human-managed club — confirm that holds at save creation, not just after the
  first season boundary.
- Player **Condition** at save creation, and whether anyone starts injured or unavailable.
- Are **fixtures** generated and is the first fixture reachable from a fresh save without any player
  action?
- The **shortest possible path** from `createSave` to a completed first match: the exact sequence of
  clicks, and every point where the game refuses to proceed until something is configured.

Record the answer as findings — file/line references and observed behaviour, with a clear list of
"must configure before first match" versus "defaulted acceptably". Ticket 08 and the eventual spec
both depend on this being real rather than assumed.
