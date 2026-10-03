# 01: Tactic saves carry revisions and refuse stale or duplicate writes

**What to build:** The tactics-save command — the one the existing tactics editor's Save button dispatches — becomes the revision-bound, idempotent write the Screen 80 spec's stable-IDs-and-expected-revisions requirement demands, served end to end.

Each club's tactic now carries a monotonic revision, incremented by exactly one on every accepted save. A submit carries the expected revision the caller read and a request id. Accepted submissions succeed and echo the new revision; a submit whose expected revision no longer matches the stored one fails with a typed conflict that names the current revision, so a caller can offer Refresh; a replayed submit carrying an already-seen request id is a no-op that returns the current state as a success rather than an error. The existing hard failures (invalid tactic, archived save, save not found) are unchanged.

The existing editor records the revision it loaded, sends it as the expected revision with a fresh request id per submit, and renders a conflict as a distinct state — last valid draft preserved, Refresh offered — instead of a bare failure line. Its happy path behaves exactly as it does today. Accepted saves replace the tactic and bump the revision atomically; the stored revision is the same value the overview will later read back.

Seam: of the tactics save for one club. A caller observes, in one type, success-with-new-revision, conflict-with-current-revision, duplicate-request-no-op, or the existing invalid-tactic / archived-save / save-not-found failures. It needs the club-and-squad validation boundary and the save-scoped identity — exactly the services the current save path already holds, no new dependency.

**Decisions:**

- A conflicting expected revision fails with a typed error naming the current one rather than being overwritten silently; the write follows the project's existing revision-echo pattern for selection submissions. See [Agent Note](../../../.agents/notes/implemented/feature/2026-08-31-league-and-nation-selection.md).
- The save command's domain errors remain tagged and narrow, so a caller can branch on a conflict without string-matching. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-tagged-domain-errors.md).
- The tactic identity stays the club's alone — a stable ID that never changes, with the revision as the changing part. See [Agent Note](../../../.agents/notes/implemented/architecture/2026-08-29-branded-domain-ids.md).
- The contract wire shape changes with the callers in the same commit, so the revision never drifts from what the screen sends. See [package conventions](../../../packages/AGENTS.md).

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] A submit whose expected revision does not match the stored revision is refused with a typed conflict naming the current revision, and changes nothing.
- [x] Replaying an accepted submit with the same request id — against the same or a later revision — is a no-op that returns the current state, not an error.
- [x] Every accepted save raises the club tactic's revision by exactly one, and the stored tactic equals the snapshot the success returned.
- [x] The existing editor saves normally in the happy path; a concurrent edit landing between read and save surfaces a distinct conflicted state with a Refresh path, and the edited draft is preserved rather than lost.
- [x] The existing invalid-tactic, archived-save, and save-not-found failures still reach the user as they do today.
- [x] `pnpm check:all` is green.