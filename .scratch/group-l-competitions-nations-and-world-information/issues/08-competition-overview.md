# 08: Screen 161 — Competition Overview

**What to build:** a Competition's landing page, composing what its siblings already produce.

Second of the two, per ticket 06's order: [164](07-competition-results.md) first, because 161
composes 162's table and 164's results and cannot sensibly precede them.

## It is a composition, not a new read

Screen 161 is the same shape as Group C's Screen 33 Club Overview, and the Group C ledger's ruling
on that one applies here: *it composes its siblings and has no model of its own.* Competition Table
(162) and Competition Fixtures (163) both shipped on 2026-09-17, and 164 arrives with the ticket
above.

So the work is composition and navigation, not a fourth read. If a figure is wanted that no sibling
produces, that is a new screen's worth of question and belongs in its own ticket.

## What it shows, and what it must not

The Competition's name and nation, its current table (or a summary of it), its next fixtures and its
latest results, each linking to the full screen.

**Eleven Group L screens are `deferred` for want of a model** — statistics, records, awards, stages,
rules, history. 161 is the screen most likely to grow a panel for one of them by accident, because a
dashboard invites it. Every one of those is a link that must not exist yet.

## Acceptance

- [ ] A Competition's overview renders, composing table, fixtures and results
- [ ] Each section links to its full screen rather than reimplementing it
- [ ] No new RPC — or an explicit, reasoned answer for why composition was not enough
- [ ] No panel for any of the eleven `deferred` screens, and no dead link to one
- [ ] `competitionOverview/` carries no `WIP` marker
- [ ] An e2e spec reaches it the way a player would
- [ ] `pnpm check:all` green and e2e green

**Blocked by:** [07](07-competition-results.md) — 161 composes 164, so building it first means
composing a screen that does not exist.

**Status:** ready-for-agent
