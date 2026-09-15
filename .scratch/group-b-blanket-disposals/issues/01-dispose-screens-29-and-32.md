# 01: Dispose screens 29 and 32 in full

**What to build:** A maintainer opening the Group B ledger can see that Manager Notebook and Manager
Chat were ruled out of this game entirely, read why, and know what would have to change for either to
return — without opening the import files and without inferring the ruling from an absent row.

Both screens were ruled out of scope at charting, before any Group B ticket opened, and neither has a
ticket of its own. This ticket writes those rulings down.

**Screen 32, Manager Chat and Multiplayer Communication.** The file is entirely the multiplayer,
network and multi-manager axis that Group A removed wholesale. There is exactly one human manager per
Save, so there is nobody to communicate with. Returns only if that changes, which would be a new
effort against a redrawn scope, not a resumption of this one.

**Screen 29, Manager Notebook.** Manager-private notes, tags, pinning, entity-linked annotations and
note-to-reminder conversion are an import invention: no note concept exists in the codebase, in
`CONTEXT.md`, or in any recorded decision, and nothing in the game asks the player to keep private
prose. The screen additionally takes the multi-manager privacy model as its premise, so it inherits
the multiplayer disposal as a second, independent reason.

**This ticket also settles a vocabulary gap, and that part is a decision rather than a transcription.**
The ledger's legend offers three statuses — `Audited`, `Reviewed`, `Not yet audited` — and none
describes a screen ruled out in full and never to be audited. `Not yet audited` asserts nothing, which
is wrong here, and `Audited` claims a section-by-section pass that nobody made. Either add a fourth
status or state an explicit convention for whole-file disposal, and update the legend so the meaning
of every status stays exhaustive. The choice is the implementer's; the legend must not be left
silently incomplete.

A whole-file disposal is one row per screen, not one row per section. The point of doing this first is
that the two sweeps which follow then skip both screens entirely.

**Seam:** the reconciliation ledger. Nothing else is read or written; no source file changes.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] Screens 29 and 32 each have a whole-file `out-of-scope` row with its reason as the anchor.
- [x] Screen 29's row records both independent grounds, not just the stronger one.
- [x] Both screens' Coverage rows carry a status that accurately describes a wholly-disposed screen.
- [x] The legend documents that status, and the set of statuses is exhaustive.
- [x] The import files are unedited.
- [x] `pnpm exec tsx scripts/verify-md-links.ts` reports nothing new.
