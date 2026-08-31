# Agent Note: Blanket scope trim across the Group A import

Status: proposed

## Problem

`docs/specs/group_a_application_shell_and_game_lifecycle_remaining/` holds 30,300 lines across 22 files
describing 21 screens. The axes ruled permanently outside this game were already settled — multiplayer,
network sessions, cloud synchronization, ownership transfer, multiple human managers, worker pools,
memory budgets. What was not known was **how much of each spec file those axes actually consume**.

The answer decides real things. If the trim removes most of every file, the sixteen remaining audits
merge into a handful of sessions. If it removes almost nothing, the corpus stays as large as it looked
and the audit has to be sliced screen by screen. Sixteen separate sessions were about to re-derive that
trim for themselves, each reading around the same out-of-scope material and each reaching a slightly
different boundary.

## Proposal

One pass over all 21 screens attributed every ruled-out section to a named axis, and the result is
recorded as `out-of-scope` rows in
[the Group A reconciliation ledger](../../../../docs/specs/group_a_application_shell_and_game_lifecycle_remaining/RECONCILIATION.md),
per the format in [[2026-08-30-spec-reconciliation-ledger]]. Every screen now carries rows before it
has been audited; each screen's preamble says the rows are the trim and nothing more, so the ledger's
silence-means-followed rule still only applies under an `Audited` status.

Audit sessions read what survived. They do not re-decide the trim.

### The trim is far narrower than charting assumed

The out-of-scope axes are concentrated, not diffuse. Screens 2, 3, 4, 6, 8, 9, 10, 12 and 17 lose only
scaffolding and a handful of clauses. Screen 5 loses one section. Screens 13, 14, 15 and 16 lose
roughly a quarter each, all of it the cloud-repository and multiplayer material. Screen 7 disappears
entirely. Screens 18–21 are heavily consumed, which charting already expected.

Roughly 25,000 lines survive across sixteen screens. The hoped-for outcome — a trim large enough to
merge the audit into a few sessions — did not happen, and the audit slicing has to be designed as work
in its own right rather than falling out of the trim.

### Screen 7 disappears

Spec 7 (Add Manager) exists to manage a roster of human manager slots: capacity, per-slot state,
network invitations, reservations, ownership binding. With one human manager per save, all of it is out
of scope. What the trim leaves — a resumable manager draft, a generated world sitting without a
manager, a Back path to the world-generation summary — is then removed by
[[2026-08-29-new-game-flow-sequence]], which runs world generation *underneath* the manager step rather
than before it. A provisional world is never a career, and cancelling deletes it rather than leaving a
draft. There is no Add Manager screen and no managerless save.

This is recorded as a `contradicted` row rather than `out-of-scope`, because the decision that removes
the residue is one this project made about its own flow, not a scope boundary.

### Two axes charting missed

- **Off-device telemetry, crash reporting, and product analytics** (spec 16 §40). The app has no backend
  to receive them, so there is no consent to collect and no privacy policy to link. Local structured
  logging is unaffected and stays in scope; the distinction is whether anything leaves the device.
- **Non-normative import scaffolding.** The `Condensed LLM implementation brief`, `Next planned item`,
  and `Suggested Git commit` sections, spec 1 §15 Clean-room constraints, and spec 1's screen-inventory
  preamble are artifacts of how the import was generated, not requirements. That is 53 sections across
  the group. The briefs matter most: each restates its own file, so auditing one double-counts every
  section it summarizes.

### Configurable resource policy is out; internal threading is not

The worker-and-memory axis rules out what the *user* can see or set: a memory-budget control and its
warnings (spec 5 §18, spec 3 §13 and §15), a worker-count preference and processing profiles (spec 16
§26–§27), and resource-pressure tuning and reporting (spec 6 §33–§34, spec 18 §4).

It does not rule out concurrency itself. Spec 2's discovery and validation threads and spec 6 §11's
generation worker pool describe internal architecture, and whether world generation runs concurrently
is a design question the audit tickets own. Drawing the line at the user-facing surface keeps a
permanent scope exclusion from quietly deciding an implementation question.

Storage-pressure handling survives for the same reason in reverse: running out of disk is reachable on
one machine and has to be handled, whatever the resource policy is.

### "Draft ownership" is vestigial throughout the manager-creation flow

Specs 8 through 12 repeat a clause requiring draft ownership to be revalidated before Save and
Continue. With a single local user there is nothing to revalidate. The clause is trimmed, but the
revision and idempotency checks it sits beside are not: a stale-revision write and a duplicated request
are both reachable locally.

### Keyword scanning finds candidates, not rows

The pass was driven by a regular-expression scan for the axis vocabulary, then read section by section.
The scan alone would have been wrong in both directions. `synchron` matches "asynchronous", which
produced false cloud hits in seven files that contain no cloud material at all. "Permission" matches an
operating-system filesystem permission in spec 14 §41, which is in scope. Conversely, spec 11's
reservation machinery never says "multiplayer" in its own section heading and is entirely a
multi-claimant construct.

Ruling a section permanently out of scope is a claim that never gets revisited, so the default on an
ambiguous section was to leave it in and let the audit decide.

## Alternatives considered

- **Letting each audit ticket trim its own screen.** No separate pass, no coordination cost. Rejected:
  sixteen sessions each reading around the same multiplayer material, reaching sixteen slightly
  different boundaries, is exactly the re-litigation the ledger exists to prevent.
- **Trimming purely by keyword scan, without reading.** Fast and reproducible. Rejected on the false
  positives above: "asynchronous" alone would have ruled seven clean files partly out of scope.
- **Recording the trim as prose per screen rather than ledger rows.** Easier to write. Rejected because
  the ledger already exists and a second format for the same claim splits the record in two.
- **Ruling Screen 7 out of scope outright.** Simpler than the split. Rejected because the roster is a
  scope boundary while the draft lifecycle is a flow decision this project made; collapsing them would
  anchor a `contradicted` row to a reason that does not carry it.
- **Marking the trimmed screens `Audited`.** Tempting, since every screen now has rows. Rejected
  because under `Audited` the ledger's silence asserts that every unlisted section is followed, and
  nothing here checked that.

## Acceptance criteria

- Every one of the 21 screens has a section in `RECONCILIATION.md` with its scope-trim rows and a
  preamble stating that the rows are the trim only.
- Every trimmed section is attributed to an axis named in the map's Out of scope.
- The map's Out of scope carries the two new axes and the sharpened wording for the two widened ones.
- No file under `docs/specs/` other than `RECONCILIATION.md` has been edited.
- `pnpm check:all` is green.

## Risks

- **The trim is a claim made without reading every line.** Sections were read where the scan flagged
  them and skimmed where it did not. A section that discusses an out-of-scope axis without using its
  vocabulary is still in the corpus, and the audit tickets are the backstop.
- **`out-of-scope` is permanent, and some rows are clause-level rather than section-level.** A row that
  trims "the memory-budget clause of §15" leaves the rest of §15 live, and a later reader may take the
  row as disposing of the whole section. The Disposition column says which, but nothing enforces it.
- **Screen 7's removal rests on a `proposed` note.** If [[2026-08-29-new-game-flow-sequence]] is
  revised so that generation precedes manager creation, the draft lifecycle comes back and the
  `contradicted` row is wrong. The trim half of the screen is unaffected either way.
- **The trim did not shrink the work.** The fog patch it was meant to clear assumed it might; it did
  not, and the audit slicing is now a ticket of its own rather than a consequence.
