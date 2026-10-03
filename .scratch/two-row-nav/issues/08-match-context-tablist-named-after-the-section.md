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

**Status:** resolved

- [x] In match and entity contexts the tablist's accessible name describes that context, not the primary section
- [x] A unit test on `SecondaryNav` asserts the tablist name in a match context

## Answer

Resolved 2026-09-16. `SecondaryNav` derives one `contextName`: the entity type, the match context,
or the section. That name gives both the navigation label (`<context> tabs`) and the tablist label.
Entity contexts had the same fault (a player profile's tablist read as its inferred section), and it
is fixed the same way. `secondary-nav.test.tsx` "the tablist is named for its context" covers a
section, the live match and a player. The match and entity cases fail with the old
`section?.label ?? label`.
