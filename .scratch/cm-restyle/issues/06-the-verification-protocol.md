# 06: The verification protocol

Type: grilling
Blocked by: 02
Status: resolved

## Question

How does each implementation ticket prove its done-condition (binding decision 10) without slowing
to a crawl? Decide: whether a reusable Playwright screenshot spec (seeded career, each screen of a
group at two window sizes) is committed or stays a throwaway; where before/after screenshots go and
whether they are kept; how WCAG AA contrast on translucent panels is checked; which Playwright specs
each group must run; and how e2e specs that assert on visible chrome are updated.

## Answer

**A committed `@screenshots` spec outside the default run, at 1440×900 and 1085×717; screenshots
compared by eye in a git-ignored folder, no pixel baselines; contrast gated by a unit test on the
colour values with axe as advice; each slice runs its own Playwright specs and fixes the tests it
breaks.** See [Agent Note](../../../.agents/notes/proposed/testing/2026-10-02-restyle-verification-without-pixel-baselines.md).
