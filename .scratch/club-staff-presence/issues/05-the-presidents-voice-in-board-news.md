# 05: The President's voice in board news

Type: grilling
Blocked by: 01
Status: resolved

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

## Answer

**The President names the warning and the dismissal; the Board Objective verdict stays
institutional; the name is resolved in the main process and handed to the projection; and the
retroactive re-voicing of old messages is fine — and said so — because the name is derived and
stable.**

- **Which messages change.** `ManagerWarned` and `ManagerSacked` gain the President's voice — those
  are the President's own acts, the Board speaking through its face. `BoardObjectiveJudged` stays
  institutional: setting and judging the Board Objective is the Board acting on its own instrument,
  and personifying the verdict would blur the face-versus-institution line ticket 01 drew. That
  settles the map's fog in the direction of the distinction, not of more personal copy.
- **What the copy says.** The subject names the person; the sacking keeps the club name in the
  subject (it anchors which club fired you); the body keeps the recorded objective-miss count the
  high-priority mechanic already depends on. Draft:
  - Warned — subject `Alan Reyes has issued a warning`; body `After season <N>, Alan Reyes has
    recorded <M> consecutive missed objectives. Another miss puts the job at risk.`
  - Sacked — subject `<Club> has terminated your contract` (unchanged); body `Alan Reyes has
    dismissed you after season <N>, following <M> consecutive missed objectives.`
- **Where the name comes from at projection time.** It does not ride on the event, and it is not
  derived inside the projection. `newsProjection` stays pure and takes facts; the main-process news
  query (`readInbox`, `career/news.ts:140`) already resolves the club context through the
  `displayNames` seam, and that is where `presidentName` is derived and added to
  `NewsClubContext`. The copy table formats it, so the projection and its tests change shape only
  in that one field. Messages projected years later name the same person automatically, because
  the President is a pure function of the world seed, club id, and nation — fixed for the life of
  the career — so "always the same person" is a property of the derivation, not an invariant copy
  must enforce. Riding the name on the event is rejected outright: it would log a second copy of a
  derivable value, which the projection exists to avoid.
- **Historical messages change, and that is fine — so it is said.** The copy table is a projection
  with no persistence of its own: every read re-projects the stored events, so a copy change
  re-voices the whole inbox retroactively by construction. Because the President's name is derived
  and fixed, the re-voicing changes the voice and never the person — a season-2 warning and a
  season-5 warning name the same person the day after the change. That is recorded in the note's
  relationship section (or the ledger) rather than left hidden in the diff.
