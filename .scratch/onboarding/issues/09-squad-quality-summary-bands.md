# Squad-quality and depth summary bands

Type: grilling
Status: resolved
Blocked by: 03

## Question

Ticket 03 commits the club-selection screen to showing a **derived qualitative** squad summary —
"Squad quality: Title contender", "Squad depth: Thin" — explicitly *not* a hardcoded label on the
club definition, because `generateSquad(statureTier)` is unseeded and two saves of the same club can
differ materially. It did not fix the banding rule that turns generated squads into those words.

- **Quality.** What statistic over the generated squad feeds it — mean `overallRating` of the best
  XI, of the whole squad, something position-weighted? And what thresholds map that number to a
  label?
- **Depth.** 03 ruled squad *size* out as a headline metric because 28 players can still lack
  positional cover. So depth has to mean positional cover, which needs a definition: adequate cover
  per Position? per broad line (GK / defence / midfield / attack)?
- **The tier-boundary problem.** Bands computed from generated data will sometimes rank a lucky
  `mid` squad above an unlucky `big` one, while Stature Tier, both budgets, and the Board Objective
  band all still say `big`. Is that contradiction shown honestly, smoothed, or prevented by banding
  *within* tier rather than across the league?
- **Challenge label.** 03 named a vocabulary (High Pressure, Rebuild, Survival, Balanced Challenge,
  Title Contender) without fixing how it is derived from the three dimensions (resources, squad,
  expectations). Two of those three are pure functions of Stature Tier, so the label is nearly
  determined by tier plus this ticket's quality band.
- **Determinism.** Generation is unseeded, so the summary must at least be a stable function of the
  squad it describes: the same generated squad must always produce the same label, and the label must
  not drift as the season runs unless that is a deliberate choice.
- Does the same summary get reused anywhere in-career (the Squad screen), or is it selection-only?

## Constraint: the field must carry independent information

Do **not** force squad labels to agree with Stature Tier, budget, or Board Objective. Those are three
views of one club-level structural category; squad quality is a derived assessment of *generated
players*. If all four always agree, the squad-quality field contributes nothing the tier did not
already say, and the screen has four columns of one fact.

A strong generated `mid` squad legitimately outranking a weak generated `big` one is therefore not
necessarily a defect — it may be exactly the information that distinguishes eight otherwise identical
`mid` clubs. What this ticket has to settle is whether such divergences are intended consequences of
generation, stable enough to communicate, meaningful to the player, and bounded enough not to
undermine club identity.

See [Agent Note: Club selection at new game](../../../.agents/notes/proposed/feature/2026-08-29-club-selection-at-new-game.md).

## Answer

**Squad Quality is the mean Position Rating of the strongest formation-valid XI, cut into six
absolute bands, derived on read and never persisted; Squad Depth and the Challenge label are both
removed.** See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-29-squad-quality-summary-bands.md).
