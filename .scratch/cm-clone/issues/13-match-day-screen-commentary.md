# 13: Match day screen: chunked resimulation + commentary

**What to build:** Wire the Match Decider from ticket 12 up to a Match day screen. Triggering a
match drives `ResumeSimulation` calls (simulating from the current point to the next interaction
opportunity or full-time in one response), with the renderer pacing the reveal client-side. Each
emitted Match Event becomes a Commentary Line via a randomly-picked Commentary Template for that
event type, with player/team names and (for Goal/HalfTimeReached/FullTimeWhistle) the running
scoreline baked in from the event payload; minute is rendered separately by the UI.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Starting a match from the UI drives the match to completion via successive `ResumeSimulation`
      calls, with no RPC streaming transport involved
- [ ] Match day screen shows a live-paced scrolling commentary feed
- [ ] A Commentary Line is emitted only alongside an actual Match Event (including the three
      boundary events); quiet Minute-Slices produce nothing
- [ ] Commentary Templates live in `packages/shared`; one is picked at random per event firing, with
      the last-used template per event type per match excluded from the next pick for that type
- [ ] Player/team names and running scoreline (Goal/HalfTimeReached/FullTimeWhistle only) are baked
      into the rendered line from the event payload; minute is rendered as a separate UI element
- [ ] Match day screen shows the final score and the completed commentary feed at full-time
