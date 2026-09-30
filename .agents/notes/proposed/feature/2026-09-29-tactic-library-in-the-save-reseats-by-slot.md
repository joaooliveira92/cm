# Agent Note: The tactic library lives in the save, and quick load keeps players by slot number

Status: proposed

## Problem

Managers need a named library of Tactic Templates next to the 29 built-in ones. Championship Manager
03/04 kept tactics as `.tac` files on disk, shared by every save, and a template holds no players.
Two questions follow: where the library lives, and what happens to the eleven players when a template
with a different shape is loaded.

## Proposal

- **Ownership.** The library is stored in the save and belongs to the manager, following them
  between clubs. It is not an app-level folder.
- **Quick load.** Loading a template replaces the Tactic's slots, runs and instructions and keeps
  each player in the same slot number, whose cell may change. The bench is untouched. The manager
  adjusts from there.
- **Operations.** Create from the current Tactic, rename, overwrite from the current Tactic,
  duplicate, delete, quick load. Built-in templates are read-only and can only be duplicated. Names
  are unique per manager, compared case-insensitively, and may not reuse a built-in name. There is
  no cap. Every operation carries a Request Id; overwrite, rename and delete also carry a
  per-template Expected Revision.

## Alternatives considered

- **App-level folder shared across saves, as CM did.** Rejected: the save is this app's unit of
  state, and cross-save state would need its own storage, versioning and conflict rules. Export and
  import can be added later without changing the model.
- **Re-seat players by Best XI on quick load.** Rejected: it silently overrides the manager's
  selections. Slot order is what CM's lineup order implies.
- **A cap on entries.** Rejected: nothing in the model depends on one.

## Acceptance criteria

- Library entries survive a save and load, and follow the manager to a new club.
- Quick loading any template onto a full Tactic leaves every player in his slot number and the bench
  unchanged.
- A built-in template cannot be renamed, overwritten or deleted.

## Risks

- A player kept by slot number may land in a cell he is poorly suited to. Accepted: the Tactics
  screen shows suitability and the manager re-seats.
