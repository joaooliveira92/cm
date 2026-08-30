# 03-matchday-mount

Type: grilling
Status: open
Blocked by: 01

## Question

Assuming the scaffold is kept (01 resolves to a/b), how does the finished match screen mount inside
`@cm-clone/desktop`?

- **Standalone demo** — a `MatchScreenDemo` surface (like today's uncommitted one) fed by the mock
  fixtures, not reachable from the app's career flow. Closest to "a clone to react to"; cheapest to
  ship; does not touch the live MatchDayScreen.
- **Replacement** — the server-driven `MatchDayScreen` becomes this screen, fed real match state over
  `window.cmClone.call`. Highest value, but collides with the live commentary-feed/polling logic and
  with keyboard-first-renderer's ticket 11, which already designs match-day live keyboard control
  against MatchDayScreen.
- **Hybrid** — this surface renders the match shell/overview; the live feed reuses it where the
  states overlap, behind the existing route.

Decide with the human, mindful that the destination is a plan-to-spec, not a build: the value of this
ticket is pinning which preconditions the spec's implementer is walking into. If 01 resolved to **c**
(delete), close this ticket out-of-scope instead — the question is moot.

## Answer

(Resolved via grilling — depends on 01.)