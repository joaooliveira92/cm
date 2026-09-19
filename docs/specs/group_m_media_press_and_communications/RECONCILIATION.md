# Group M reconciliation ledger

The specs in this directory are an **import**, not a set of requirements. This ledger records every
place the import is knowingly not followed, and why. Its format is the one the
[Group A ledger](../group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md) pilots.
The import files are never edited.

## The whole group is excluded, and it is one ruling applied thirteen times

Transcribed 2026-09-18 as milestone [M1](../../../.ai/MILESTONES.md) step 1, from the
`group-m-media-press-and-communications` effort, which charted the group, resolved two tickets and
wrote a `spec.md` that is itself a deviation register rather than a build spec. This is the
best-evidenced group in the M1 sweep: unlike the others, its `.scratch/` record already stated its own
conclusion cleanly, and nothing here corrects it.

**The decisive finding was that [`CONTEXT.md`](../../../CONTEXT.md) already excluded this group before
the import arrived.** Line 753:

> It does not govern player contracts, wage negotiation, promised playing time, dressing-room
> relationships, **media handling**, or board relations — none of those systems ship in v1.

And again at 445–447, where the *absence of press content* is the stated reason the **Calendar** needs
no finer-grained clock than "jump to the next scheduled event". The exclusion is not incidental; another
design decision is already resting on it.

That reframed the effort's own ticket 02 from a scope question into a question about overturning a
recorded decision, and it answered **no**: the exclusion stands, all thirteen screens stay out of v1,
and `CONTEXT.md` is unchanged because it was already right.

## The one thing this group's own ruling is missing

Ticket 02 chose "out of v1". It did not say whether that means `out-of-scope` or `deferred` in this
ledger's vocabulary, and those mean opposite things — `out-of-scope` is never revisited, `deferred` is.

**This ledger records the rows as `deferred`, provisionally, and flags the question rather than settling
it.** The reasoning:

- The effort's ruling rests on a **v1 exclusion**, and `CONTEXT.md` says "do not ship in v1", not
  "never". On its face that is `deferred`.
- But ticket 02's own argument points the other way in substance: reopening media "would be a
  programme, not a group" — reputation, morale, a consequence decider, persistence, balance and a finer
  Calendar, with `CONTEXT.md` amended in the same commit as the first code. That is a stronger
  statement than ordinary deferral.
- And the same question governs roughly twenty screens in five groups, not just these thirteen. Group D
  58 and 60, Group E 78 and 79, Group J 137–140, and Group K's board-relations screens all rest on the
  same `CONTEXT.md` sentence.

Deciding it for twenty screens is not a transcription pass's call. Raised as a decision request; see
§ What this ledger leaves owed. `deferred` is the provisional kind because it is the reversible one —
if the answer is `out-of-scope`, changing these rows costs nothing, whereas an `out-of-scope` row that
should have been `deferred` is one nobody re-reads.

## What each status asserts

| Status | What silence about a section asserts |
|---|---|
| `Deferred in full` | Nothing is owed. The screen was excluded as a whole file and its one row covers every section. The kind is provisional; see above. |

No screen here is `Audited` or `Reviewed`. A section-by-section pass is not owed on a group excluded as
a whole, which is the same treatment the
[Group R ledger](../group_r_multiplayer_administration/RECONCILIATION.md) gives its thirteen screens.

## Coverage

| Screen | Import file | Status |
|---|---|---|
| 181 Media Centre | [181_media_centre.md](181_media_centre.md) | Deferred in full |
| 182 Press Conference | [182_press_conference.md](182_press_conference.md) | Deferred in full |
| 183 Individual Media Interview | [183_individual_media_interview.md](183_individual_media_interview.md) | Deferred in full |
| 184 Pre-Match Media Briefing | [184_pre_match_media_briefing.md](184_pre_match_media_briefing.md) | Deferred in full |
| 185 Post-Match Media Briefing | [185_post_match_media_briefing.md](185_post_match_media_briefing.md) | Deferred in full |
| 186 Transfer Media Response | [186_transfer_media_response.md](186_transfer_media_response.md) | Deferred in full |
| 187 Player and Staff Public Statement | [187_player_and_staff_public_statement.md](187_player_and_staff_public_statement.md) | Deferred in full |
| 188 Manager Public Statement | [188_manager_public_statement.md](188_manager_public_statement.md) | Deferred in full |
| 189 Media Rumours and Speculation | [189_media_rumours_and_speculation.md](189_media_rumours_and_speculation.md) | Deferred in full |
| 190 Journalist and Media Outlet Profile | [190_journalist_and_media_outlet_profile.md](190_journalist_and_media_outlet_profile.md) | Deferred in full |
| 191 Media Relationships | [191_media_relationships.md](191_media_relationships.md) | Deferred in full |
| 192 Public Reaction and Narrative Tracking | [192_public_reaction_and_narrative_tracking.md](192_public_reaction_and_narrative_tracking.md) | Deferred in full |
| 193 Communication History and Transcript | [193_communication_history_and_transcript.md](193_communication_history_and_transcript.md) | Deferred in full |

Ticket references below are deliberately unlinked: they live under `.scratch/`, which is cleared when
an effort is archived, and this ledger outlives the effort that produced it.

## The ruling

| Sections | Kind | What the spec asks | Disposition | Anchor |
|---|---|---|---|---|
| All thirteen import files, whole files | `deferred` | A media subsystem: a media centre, press conferences and interviews, pre- and post-match briefings, public statements by the manager and by players and staff, rumours, journalist and outlet profiles, media relationships, narrative tracking, and a transcript history. | None of it exists, and none is planned for v1. | [`CONTEXT.md`](../../../CONTEXT.md) line 753 — media handling does not ship in v1 — reinforced by 445–447, where the absence of press content is why the **Calendar** needs no finer clock. Tickets 01 and 02. |

## What ticket 01 found, and why it is worth keeping

The survey is the evidence behind the ruling, and two of its findings are load-bearing beyond this
group:

- **All thirteen screens are absent — not even stubbed.** The repo has a stub idiom that roughly thirty
  screens use, and no Group M screen uses it. This is the one group whose exclusion needs no
  placeholder cull, because nothing was ever routed. Compare Group D, where eleven disposed screens
  kept their placeholders.
- **None of the supporting data exists either**: no manager reputation, no morale, no board opinion
  beyond one annual **Verdict** from league position plus a consecutive-miss counter, no relationship
  model, and no command anywhere that produces text.
- **The game does generate prose, and it is not a generator.** **Commentary Template**s and the News
  copy table both produce text, and both are deterministic lookups rather than generative. A media
  subsystem would need the first generative content path in the codebase, which is a determinism
  question as much as a feature one — see the deterministic-seed decisions in
  [TRACEABILITY.md](../../../.ai/TRACEABILITY.md).

## What this ledger leaves owed

- **The kind question, for roughly twenty screens in five groups.** Is a recorded `CONTEXT.md` v1
  exclusion `out-of-scope` or `deferred`? It governs this group's thirteen screens plus Group D 58 and
  60, Group E 78 and 79, Group J 137–140, and Group K's board-relations screens — and Group K cannot be
  charted without it. Raised 2026-09-19 as [spec-ledger-kinds decision request 01](../../../.scratch/spec-ledger-kinds/decision-request-01-is-a-v1-exclusion-out-of-scope-or-deferred.md), which recommends `deferred`.
- **Nothing else.** This group has no unfiled ticket, no stale placeholder and no open modelling
  question that is reachable without reopening the scope decision. Its effort closed cleanly, which
  makes it the one group in the M1 sweep that transcription did not have to correct.
