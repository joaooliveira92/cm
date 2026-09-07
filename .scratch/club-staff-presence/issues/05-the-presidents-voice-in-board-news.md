# 05: The President's voice in board news

Type: grilling
Blocked by: 01
Status: open

## Question

`newsCopy.ts` has a `board` category whose copy is institutional: *"The board has issued a
warning"*, *"The board has dismissed you after season N"*. Under charting's settled frame the
President is that voice, and this is the reader that justifies the President today — while the staff
page is still unbuilt.

Settle:

- **Which messages change.** `ManagerWarned` and `ManagerSacked` are the clear cases. The Board
  Objective verdict message is less clear: setting and judging an objective may be the institution
  speaking rather than a person, and the map carries that as fog rather than an assumption.
- **What the copy says.** Naming a person changes the register — *"Alan Reyes has warned you"* is a
  different sentence from *"The board has issued a warning"*, and the difference is the whole point.
  Decide how far the rewrite goes and whether the club is still named alongside.
- **Where the name comes from at projection time.** News copy is a projection over the event stream,
  and events carry payloads. Decide whether the President's name rides on the event, is derived at
  projection time from the club id, or is resolved by the reader — and whether a message projected
  years later must still name the same person (it must, since presence people never change, but the
  mechanism has to make that true rather than assume it).
- **Whether historical messages in an existing save change.** The projection runs over stored
  events, so a copy change is retroactive by construction. Decide whether that is fine or whether it
  needs saying somewhere.

This ticket touches a projection with existing tests, so it is a real change rather than a copy
tweak.
