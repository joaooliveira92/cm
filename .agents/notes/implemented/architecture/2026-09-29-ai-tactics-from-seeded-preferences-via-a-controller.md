# Agent Note: AI clubs pick tactics from seeded CM preferences, through a controller outside the engine

Status: implemented

## Problem

AI clubs picked the best of five v1 formations by mean Position Rating and fixed their instructions
at balanced/normal/medium, and never changed anything during a match. Championship Manager 03/04's AI
managers carried tactical preferences as staff attributes and changed style and formation mid-match
(its commentary file has events for it; see the
[instructions research](../../../../docs/research/formations-and-instructions-cm0304-team-and-player-instructions.md)).
AI clubs here have no manager person, and AI-versus-AI matches are simulated in one go inside an
engine that must not know tactics vocabulary.

## Proposal

- **Identity.** Each AI club derives CM's five staff preferences from the world seed and its
  stature, as Bound Staff quality is derived, with no stored rows: Preferred Formation (a built-in
  template), Playing Mentality (attacking, adventurous, cautious, sitting back), Pressing Style
  (mixed, stand off, closing down), Playing Style (mixed, passing, direct, long), Marking Style
  (mixed, zonal, man).
- **Before the match.** Start from the preferred template. If the squad's average suitability for it
  is below 15, take the template among its variants and the common presets that yields the best XI.
  Map the style preferences onto Team Instructions and shift Mentality one step by relative strength
  and venue. The AI may read the opponent's Phase Strengths and last-used formation, which are
  public, and nothing hidden.
- **During the match.** A deterministic rule table evaluated every five minutes and after goals and
  red cards: losing after 60' → Mentality +1; after 75' → +2 and the attacking variant; winning by
  one after 75' → −1; after 85' → Men Behind The Ball; a red card → a template dropping a forward.
  Each change emits CM's tactical-change commentary events. Thresholds are tuning constants.
- **Where it runs.** The simulation loop accepts a tactical controller callback, invoked at those
  points, implemented outside the engine package. It returns a new Tactic, which resolution turns
  into numbers again. For the human's opponent the controller's changes are journaled as
  `ChangeTactics` commands, so AI changes use the same operations and validation as a human's, and
  replay reproduces them.

## Alternatives considered

- **Give AI clubs a manager person with stored preferences.** Rejected here: a world-scale entity
  change for one consumer. Seeded derivation gives the same variety at no storage cost.
- **Let the engine run the AI rules.** Rejected: the engine would need tactics vocabulary.
- **Random in-match AI changes.** Rejected: harder to test and to tune; a rule table is deterministic
  without extra RNG draws.
- **Let the AI read hidden opponent data.** Rejected: the human cannot, so the AI would out-scout the
  player.

## Acceptance criteria

- Two AI clubs with different seeds field different templates or instructions across a season.
- A losing AI side changes Mentality at the stated minutes, visible in commentary.
- Replaying a human match reproduces the opponent's changes exactly.

## Risks

- A rule table is predictable; players may learn to exploit it. Variety comes from the preferences.
