# 03: Plan, save and reset the microcycle's training schedule

**What to build:** the manager opens a Training Schedule screen from the Training Overview and sees
the five sessions planned before the next Fixture, with that Fixture named. They set each session's
type and intensity, or apply a template (Balanced, Match Preparation, Recovery, Heavy) to the draft,
and save it with **Save Schedule** in the bottom bar. **Reset Schedule** throws the draft away and
reloads the saved schedule. The schedule survives reloading the career. A new career reads as
Balanced with no setup step. The Training Overview gains a Schedule card naming the template or
"Custom". This slice changes no gameplay: the schedule is stored and shown, and 04 makes it act.

The slice's edge: the read fails only when the save cannot be found. The write fails with a typed
revision conflict carrying the current revision when the schedule moved under the editor, and with a
typed validation error for a slot outside the closed session set; both belong in the error channel,
not as defects. Both handlers need only the SQL client and the save's event streams. Every saved
schedule appends a Club-stream event naming the manager as its author.

**Decisions:**

- The schedule attaches to the microcycle between the club's Matchdays, with no daily or weekly clock. See [Agent Note](../../../.agents/notes/proposed/architecture/2026-09-28-training-schedule-attaches-to-the-microcycle.md).

**Blocked by:** None (can start immediately).

**Status:** claimed

- [ ] The shared rules package defines the session types, intensities, the five-slot schedule and the four named templates, each a pure value.
- [ ] A new table holds one schedule per human-managed club with its slots, template name and revision; a missing row reads as Balanced.
- [ ] The read returns the schedule, its revision and the next Fixture; the write takes an expected revision and a request id, and replaying the same request is a no-op.
- [ ] A stale save shows the conflict with a Refresh that keeps the draft until the new revision lands, as the Tactics editor does.
- [ ] Applying a template changes only the draft, never the saved schedule.
- [ ] Save Schedule and Reset Schedule appear in the bottom bar on this screen only, carry the `data-action-id` of registered `training`-scope Actions, and are listed in the command palette.
- [ ] Reset Schedule is disabled when the draft matches the saved schedule.
- [ ] Every session control is a native select, reachable by keyboard, with the focus ring.
- [ ] The Training Overview's Schedule card names the current template or "Custom" and links to the screen.
- [ ] `CONTEXT.md` defines Microcycle, Training Schedule and Training Session, and its Calendar entry says training content attaches to the microcycle rather than to a date.
