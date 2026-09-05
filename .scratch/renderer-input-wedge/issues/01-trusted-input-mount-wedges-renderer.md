# 01: Trusted input that mounts UI wedges the renderer (two live reproductions)

Type: bug
Status: ready-for-agent

## What was measured

Found on `dev` at `9944adc` while repairing the e2e suite, in the built app (`pnpm build`, then
Playwright against `dist/main/index.js`) — not in jsdom.

From a seeded career on the Squad screen, with the teaching splash already dismissed and the
renderer confirmed responsive (`page.evaluate(() => "alive")` returns in **3ms**):

| Keystroke | `keyboard.press` returns in |
|---|---|
| `a` | 3ms |
| `Shift` | 2ms |
| `ArrowDown` | 4ms |
| **`g`** | **never** — 24s and 49s in two runs, ending only when the test timed out and the app was killed |

After the wedge the page is gone: the next `page.evaluate` fails with "Target page, context or
browser has been closed".

It is a **spin, not a deadlock**. Sampling the process tree 4s after the keypress shows one
Electron process at **202% CPU** (it idles at ~19% before the press). That is a tight loop across
threads, not a blocked await.

## A second reproduction, on a different screen and a different input

The same measurement on Transfers, selecting the first Market row (`td > button`) with a real
click — which mounts the contextual "Place bid" region (AC-29):

- renderer answers in ~3ms immediately before the click
- `locator.click` logs "performing click action" and never returns
- one Electron process at **169.8% CPU** four seconds later

So this is not about the `g` key, and not about `aria-live`. The shared shape across both
reproductions — and across the teaching-splash bug this repo already fixed — is:

> a **trusted, discrete** input handler calls `setState`, and that state change **mounts new UI**
> into the same tree during the event's synchronous flush.

The useful negative control: `TacticsScreen` drives eleven Base UI `Select`s by real clicks, each
of which mounts a portalled listbox, and it does **not** wedge (`app.spec.ts` "Tactics screen shows
11 slot rows" passes in 3.0s). Whatever Base UI does differently at mount time — portal, transition,
deferred open — is probably the shortest path to the answer.

## Why this is one bug and not eleven failing tests

`g` is the navigation prefix (AC-18). Every keyboard-driven e2e spec starts by pressing it, so a
single hang presents as most of the keyboard suite timing out at the 45s ceiling:

- `keyboard.spec.ts` — all four coverages (`g <key>` nav, palette, Squad grid roving, Escape
  layering) enter through `enterCareer` + `pressPrefix`
- `journeys.spec.ts` — the AC-33 substitution journey and the keyboard transfer-bid journey
- `error-paths.spec.ts` — the over-budget bid path, which hangs on the Market row click above

These specs are **correct and should stay red** until this is fixed. They were not weakened as
part of the e2e repair, on purpose.

## Where to start

Two entry points, one suspected cause.

`src/renderer/KeyboardSpine.tsx`. Pressing `g` is the only keystroke that flips
`prefix.active` true, and the only thing that flag does is mount `PrefixIndicator`:

```tsx
{prefix.active && !splashActive && layer === "none" && (
  <PrefixIndicator entries={effectivePrefixEntries} />
)}
```

`setPrefix` is called from `onKeyDown`, i.e. inside a **trusted, discrete** input event, so React
flushes the commit that mounts `PrefixIndicator` synchronously within that event.

**This repo has already had this exact bug once.** The teaching splash wedged the renderer the same
way — a trusted click tearing down the autofocused splash inside the event's synchronous flush —
and the fix was to defer the state change one macrotask. The regression test for it is
`e2e/teaching-splash-dismiss.spec.ts`, and its header comment describes the mechanism. Suspect the
same shape here and check the same remedy.

Worth ruling in or out while there: `PrefixIndicator` is an `aria-live="polite"` `role="status"`
region, so mounting it also mutates the accessibility tree — which Playwright has instrumented.
Confirm whether the spin reproduces outside Playwright (`pnpm dev`, press `g`) before concluding it
is purely a React-commit problem; that one observation splits the diagnosis in half.

`prefixReduce` itself (`src/renderer/keymap/prefix.ts`) is pure and is not the suspect — it is
unit-tested and returns a plain object per event.

For the second reproduction, the equivalent seam is the Market row's `onToggleSelection` /
`onRowPrimary` path in `src/renderer/transfers/` reaching `BidComposer` (`aria-label="Place bid"`),
which mounts only once a row is selected.

- [ ] Root cause named, and whether it reproduces outside Playwright recorded here
- [ ] Fixed without weakening the `g <key>` acceptance criteria (AC-18)
- [ ] A regression test in the class of `teaching-splash-dismiss.spec.ts` — one that bounds the
      keystroke and asserts the renderer still answers — so the next occurrence fails fast
      instead of costing the suite 45s per keyboard test
- [ ] `keyboard.spec.ts`, the two `journeys.spec.ts` keyboard journeys, and
      `error-paths.spec.ts` pass again
