# Agent Note: Match-day visual language

Status: proposed

## Problem

The match-day surface had no visual owner. The `retro-match-screen` effort owned it
originally, was archived on 2026-08-30, and its prototype directory
(`apps/desktop/src/renderer/components/match-screen/`, deleted from a historical commit
and recoverable at `6d6ba56^`) was removed in the same pass. `MatchDayScreen.tsx` is
consequently a live career screen on the same flat dark slate as everything else — yet it
is the one screen the adopted chrome-blue visual frame was designed *for*. The prototype's
966-line `styles.css` supplied every token the visual-frame decision later adopted; its
layout anatomy (scoreboard, incidents grid, possession panel, fixture panel, sidebar nav)
and its competing answers to the career navigation question were left to a decision that
never ran.

This screen decides whether match day renders in the chrome-blue frame like every other
career screen, or carves its own lane.

## Proposal

**Match day renders inside the career chrome, on the shared token system, with a thin
match-only vocabulary.** The "distinct lane" lives in the content region, never in the
shell.

### Containment

Match day is a `CAREER_TABS` entry wired to `g d` and the keyboard spine; it renders as the
child of `CareerShell` beneath the ticket-04 two-row chrome (gradient title bar with club
identity and date/Continue cluster; restyled tab strip). A breakout into the prototype's own
full-window shell (its sidebar, its scoreboard-as-window) is rejected: it re-opens routing
already closed by construction, and the sidebar's Prev/Next + Continue Game + nav items were
already a second, losing answer to the navigation question settled in the career-chrome
decision. The chrome stays identical to every other career screen.

### Token split

The scoreboard is the only match-only element; everything else on the surface — page
background, panels, text, buttons, the stadium wash, status colors — is shared. Match day
therefore introduces **one match-only token family: the scoreboard surface** (white-on-dark
score boxes and the chrome band treatment that frames them). It is purpose-built because no
other screen has a scoreboard, and it is kept thin deliberately: the anti-drift answer to
"carve its own lane" is *mostly no*. Match-only colors still read through the shared
`@theme` mechanism of the token-adoption decision, so nothing here is a second foundation.

### Stadium backdrop

The immersive cue is **CSS-only from existing tokens**: the page background, the chrome
gradient as a wash, and a `panel-dark` overlay. No image assets, no dependency on the
deferred `--bg-image` value. The visual-assets pipeline remains deferred (see the map's
Not-yet-specified); when — if ever — a stadium image exists, it is injected *under* the
overlay, which is the seam this decision keeps.

### Scoreboard

The **neutral version** of the prototype's scoreboard: a chrome-band background, white
score boxes with dark numerals, the two club names flanking the score. It renders from name
and score alone, because that is all the domain exposes — `ClubSummary` carries `id`, `name`,
and `statureTier`, no colors or crests, so the prototype's club-gradient headers are
unbuildable at HEAD. The neutral archetype is the match-day picture and needs no club data.

### In-match Continue

Career Continue and in-match play are **two verbs**. The career `continue` Action is the
season verb; it is bound, `primary: true`, and lives in the chrome's temporal cluster per
the career-chrome decision. During a live match the season is decoupled (the match flow is
calendar-independent, the feed auto-paces), so that Continue is **unavailable** and the
cluster instead shows the **match readout** — the match clock (e.g. `45'`) plus state — in
the same slot the season readout occupies. At full time the cluster returns to
`Season n · Matchday m/38` + Continue. One primary verb on screen at a time. This is an
extension of the career-chrome note, not a supersession: the label stays "Continue", and the
during-match readout is a distinct mode the identical cluster renders.

### Commentary feed and incident markers

The feed's visual vocabulary is match-only and owned here, thinly: a **minute gutter** and
the **incident color mapping**, both drawn from the shared `--text-warning` / `--text-danger`
/ `--text-success` tokens so the palette stays one. General panel and typography spacing is
handed to the layout-grammar decision (the map's ticket 07), which must not be blown past
tables and forms into match-day-specific elements.

### Salvage

Only **anatomy, and only where the live data exists**: scoreboard anatomy, minute-gutter
feed, and panel chrome. The prototype's possession panel, incidents grid, and fixture panel
are explicitly deferred — the live match simulation models commentary reveal only; there is
no possession, incidents, venue, or fixture data to render at HEAD, and visuals built ahead
of the data would guess at schema. **No prototype component code is salvaged**: it is
off-architecture (stale RPC-less state, no keyboard model), and the tokens it carried were
already absorbed into the frame and token-adoption decisions.

## Alternatives considered

- **Breakout shell.** The prototype's own full-window match shell, with its sidebar
  (Prev/Next, Continue Game, nav items) and scoreboard-as-window. Rejected: match day is a
  `CAREER_TABS` entry wired to `g d` and the keyboard spine; the career-chrome decision
  settled the chrome and rejected the sidebar; a breakout re-opens routing already closed by
  construction, and its Continue Game is a competing answer to the career Continue that same
  decision already rejected.
- **Full stadium image.** The prototype's stadium photo with a 0.72 dark overlay. Rejected
  for now: no image assets, no sourcing plan, licensing open, and the frame decision defers
  `--bg-image`. The CSS-only wash delivers the cue with zero assets, and the kept overlay
  seam means a future image is an injection, not a redesign.
- **Club-colored gradient headers on the scoreboard.** The prototype's approach, which needs
  `club.theme`. Unbuildable at HEAD. The alternative of rendering the score as a heading
  inside an ordinary panel was weighed and rejected: a plain panel heading gives the screen
  no distinct match-day identity, where the neutral chrome-band scoreboard gives the
  archetypal picture with no club data.
- **Deferring the whole feed to layout grammar (ticket 07).** Rejected: the minute gutter
  and incident coloring are match-only concerns; only general spacing belongs to the shared
  grammar. Handing the feed over wholesale would strain 07's table/form scope with
  match-day-specific elements.
- **A full match-only token family.** Rejected on drift grounds: the two palettes that would
  result are exactly the "unrelated palettes" the ticket set out to prevent. The scoreboard
  is the single honest match-only element.
- **Building possession / incidents / fixture panels now.** Rejected: the simulation models
  no corresponding data at HEAD; building visuals ahead of the schema is guessing.

## Acceptance criteria

1. Match Day renders as a `CareerShell` child beneath the career chrome (gradient title bar,
   tab strip, Continue cluster): no sidebar, no breakout shell, no chrome change.
2. The screen consumes the shared token system; the only match-only token family is the
   scoreboard surface.
3. Stadium wash is CSS-only from existing tokens; no new image-asset dependency; the overlay
   seam is named as the future image injection point.
4. The scoreboard is the neutral chrome-band, white-score-box pattern rendered from club
   names and score alone.
5. During a live match the chrome's temporal cluster shows the match readout; at full time it
   returns to the season readout + Continue.
6. The feed renders a minute gutter and incident colors from the shared
   warning/danger/success tokens; general spacing is delegated to the layout-grammar section
   of the spec.
7. Possession, incidents, and fixture panels are not built and are recorded as deferred on
   engine data.

## Risks

- **The chrome must know a match is live.** At HEAD the `continue` Action's availability
  does not model an in-flight match, and the during-match readout needs the cluster to
  switch on it. The signal exists (`match/session.ts`'s active-match session and the Match
  Day screen's scope-state) but the spec must wire the readout to it, or the cluster drifts
  back to a stable season line mid-match.
- **The CSS-only wash can read as "just a gradient"** without the image. The panel-dark
  overlay and the chrome band must carry the stadium cue themselves, which is a deliberate
  visual constraint, not a bug.
- **The neutral scoreboard forgoes club-color fidelity.** A deliberate departure from the
  prototype; if club colors ever exist in the domain, upgrading the band is a token change,
  not a redesign.