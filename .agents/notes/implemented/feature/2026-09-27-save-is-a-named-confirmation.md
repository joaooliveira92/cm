# Agent Note: Save is a named confirmation, and the name is generated

Status: implemented

## Problem

A save's name was the first field of the Manager step's personal-details panel: required, typed by the
player before anything else, and shown again on Review. Separately, the game had no Save action at all,
because every Command is durable at commit
([Durable at commit](../../proposed/architecture/2026-08-30-durable-at-commit-persistence.md)).

The product owner asked for the opposite on both counts: don't ask for a name during setup, generate
one in the background, and offer it pre-filled in a dialog when the player explicitly saves, where
they can keep, edit, or replace it.

## Decision

### The name is generated at commit, never shown during creation

`suggestedSaveName` (`renderer/create/suggestedSaveName.ts`) builds
`First_Last_FavoriteClub_ChosenClub_YYYYMMDD-HHmm` from the creation session. The chosen club only
exists after the club step, so the name is composed in `handleCommitCareer`, not when personal details
are filled in. The timestamp is the renderer's wall-clock time at that moment. The favorite club is
optional, so its segment is dropped when there is none. Each part is one segment: inner spaces and
underscores become `-`, and characters no file system accepts are removed.

The name goes through the existing `commitCareer` payload into `save_meta.name`, so there is no new
column. The setup flow never renders it. The save-name field is gone from personal details, from
`personalDetailsComplete`, and from Review.

### Save writes the name, and only the name

The career toolbar has a **Save** button (`chrome/SaveGameAction.tsx`). It opens a dialog pre-filled
with the save's current name. For a new career, that is the generated name. Confirming calls the
`saveCareer` RPC, which trims the name, refuses a blank or over-120-character name with
`InvalidSaveNameError`, updates `save_meta.name`, and returns the `SaveSummary`. The mutation
invalidates the save-wide key, so the header's save name updates.

Durable at commit still holds. Save flushes nothing because nothing is pending. Confirming the name is
the only thing a Save has to do.

## Alternatives considered

- **Keep the field and pre-fill it.** Rejected: the request was explicitly that the name is not shown
  during setup.
- **Store the suggestion in its own column beside `name`.** Rejected: it would be a second name that
  can disagree with the first. It would also need a schema change, when the pre-fill only needs the
  current name.
- **Name the file after the save name.** Rejected: files stay `<SaveId>.sqlite`, so a player-typed name
  never becomes a path, and two saves can share a name (the Load list already allows duplicates).
- **Save As (copy to a new id).** Not built. It was not asked for, and the More menu's `save-as` entry
  stays unwired.

## Consequences

- Archived saves can be renamed: the name is metadata, not a Command on the career, so it skips the
  `SaveArchivedError` guard.
- The `createSave` compat shim and every test world still take an explicit name. Only the player's
  creation flow generates one.
- The name is a wall-clock label, so two careers created in the same minute with the same manager and
  clubs get the same name. Duplicate names were already allowed.
