# 03: The first club-scoped route

Type: grilling
Blocked by: None (can start immediately)
Status: open

## Question

No route in this app takes a club id. The navigable destinations are `squad`, `tactics`, `league`,
`fixtures`, `transfers`, `news`, `match`, `seasonSummary`, `manager`, plus the pre-career flow — all
of them scoped to the save, none to a club. This effort introduces the first one, at
`club/$clubId/staff`, and the segment will be reused by every club screen that follows.

Settle:

- **The navigation adapter's shape.** `navigateCareer` takes a typed destination union. Decide how a
  club id rides on it and whether `club` is a destination with a leaf or a leaf in its own right.
- **Where you enter from.** League table rows, fixture rows, and transfer rows all name clubs today
  and none of them is clickable. Decide which become entry points in this effort and which are left
  for later — this is the difference between a screen you can reach and a screen that exists.
- **How you get back.** These entry points are lateral, not hierarchical: you reach a rival's staff
  page from the league table and you are still mid-season on your own club's clock. Decide what Back
  means here and whether the shell's existing chrome already answers it.
- **Whether the screen registry, focus coordinator, and keymap need anything** for a route that
  varies by parameter. Every shipped screen has a fixed `screenId`; a parameterised one may not.

Deliberately not deciding what the page *shows* — that is ticket 04, which this unblocks.
