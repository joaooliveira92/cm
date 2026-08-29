# Where the contextual-help line sits

Type: grilling
Status: open
Blocked by: 05, 07

## Question

The map keeps 03/04's simulation-first spine and rejects its section-13 failures, which are mostly
failures of explanation: information overload, poor explanation of consequences, and a hard
dependence on pre-existing football knowledge. 03/04 solved these outside the game, via a printed
manual and forums. We do not get that option.

Ruled out already: a scripted first-run tutorial (out of scope on the map). Ruled in: contextual
help. This ticket draws the line between them precisely.

Open questions:

- **What forms of explanation are permitted?** Candidates, roughly in order of intrusiveness:
  tooltips on Attributes; a per-Position hint of which Attributes matter; inline explanation of what a
  tactical instruction changes; an empty-state on each screen explaining what it is for; a "what
  should I do now?" affordance; an in-app manual page. Which of these are in, and what is the
  principle that separates in from out — so the spec can answer cases nobody has thought of yet?
- **The dependence on football knowledge** is the hardest of the section-13 problems. A player who
  does not know what a defensive midfielder does cannot be helped by a tooltip on `Positioning`. Is
  that dependence accepted as inherent to the genre, or is there a floor of explanation below which
  the game does not go?
- **Consequences** are the doc's sharpest complaint: it was never obvious how training intensity,
  tactical instructions, or staff quality interacted. With manager pillars (ticket 01) adding another
  invisible multiplier layer, does this effort owe the player any visibility into *why* an outcome
  happened?
- Does help **taper**? Something shown on every save forever is a different artifact from something
  shown only in a first career — and the latter edges toward the scripted tutorial that is out of
  scope.
- Ticket 07's findings bound this: whatever a fresh save leaves unconfigured is precisely where a
  new player gets stuck, and is the strongest candidate for explanation.
