# 08: In a match context the secondary tablist is named after the primary section

**What to fix:** on the live-match screen the secondary row reads, in the accessibility tree:

```
- navigation "Live Match tabs":
  - tablist "Squad":
    - tab "Match" [selected]
    ...
```

Seen in the page snapshot of `e2e/app.spec.ts` "Match Day starts a match…" during desktop-suite-red
ticket 10. `SecondaryNav.tsx` labels the tablist `section?.label ?? label`. In a match context the
active section stays whatever the primary route resolves to, so a screen reader announces the match
tabs as "Squad", a section the player is not in. An entity context probably has the same problem.
Check it.

Match ticket 05 (match-context navigation) is resolved. This is a labelling defect in what it shipped.

**Blocked by:** None

**Status:** ready-for-agent

- [ ] In match and entity contexts the tablist's accessible name describes that context, not the primary section
- [ ] A unit test on `SecondaryNav` asserts the tablist name in a match context
