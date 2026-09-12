# 02 — Screens 24, 25, 26: audit the News Inbox

Type: grilling
Status: resolved

## Question

Audit the three news specs —
[24 News Inbox](../../../docs/specs/group_b_global_navigation_and_inbox/24_news_inbox.md),
[25 Individual News Message](../../../docs/specs/group_b_global_navigation_and_inbox/25_individual_news_message.md),
[26 News Filters](../../../docs/specs/group_b_global_navigation_and_inbox/26_news_filters.md)
— against the one screen that implements all three, and produce their ledger rows.

Three specs, one implementation: [NewsInboxScreen.tsx](../../../apps/desktop/src/renderer/news/NewsInboxScreen.tsx)
(373 lines) and [inboxState.ts](../../../apps/desktop/src/renderer/news/inboxState.ts) (103 lines)
already carry the list, the filters, and the message pane. They are audited as one ticket because
splitting them would make three sessions re-read the same 476 lines and re-derive the same model.

`CONTEXT.md` already defines **News Message** and **News Inbox**, including the standing warning that
"Inbox" unqualified is ambiguous against the **Transfer Inbox**. The audit holds that vocabulary; it
does not reinvent it.

What to establish:

- Whether the message pane is genuinely screen 25, or whether screen 25 wants a separate route this
  game has decided against.
- Whether the implemented filters match screen 26's model, and what screen 26 asks for that is absent
  (saved filters, filter persistence, whole-inbox counts).
- **Read/unread**: whether it exists, what it persists to, and whether the import's model is compatible.
- What screen 24 asks for that no event produces — the point where an audit finding becomes a taxonomy
  question rather than a ledger row. Flag it; do not resolve it here.

No code changes.

## Done when

- All three screens move off `Not yet audited`, each with its own status line.
- Rows cite the existing `CONTEXT.md` terms rather than introducing parallel vocabulary.
- Any News Message taxonomy hole is reported to the map's fog with enough sharpness to become a ticket,
  or explicitly found not to exist.

## Answer

2026-09-12. All three screens moved off `Not yet audited` to `Reviewed` — a single-session pass over
24 (238 lines), 25 (229 lines), and 26 (219 lines) against the NewsInboxScreen implementation (402
lines) and inboxState (103 lines).

The implementation covers the three screens as one list-and-detail route, which is itself a deliberate
design choice documented in the screen file's header comment. Key findings per screen:

**Screen 24 (News Inbox):** The implementation has view tabs (All/Unread/Action/Flagged/Archived),
category toggles (Board/Season/Transfers/Results/Development), search, bulk Mark-read and Archive-all,
keyboard navigation, and counts. Missing: sender summary, entity links, explicit deadlines,
virtualization, debounced search, bulk preview, and eight distinct operation states. Most gaps are
`deferred unscheduled` — the implementation notes they only matter at scale.

**Screen 25 (Individual News Message):** Not a separate route. The message pane (`MessagePane`)
renders inline beside the list. It shows subject, body, category, date, state, action-required badge,
and toggle buttons (Read/Flag/Archive). Missing: entity links, content blocks, attachments, action
history, navigation context, and Previous/Next buttons. The one actionable path is "Answer on
Transfers" for bid messages.

**Screen 26 (News Filters):** Inline filter bar with view tabs, category toggles, and search. Missing:
date range, sender type, club/competition/priority criteria, saved presets, matching count preview,
and the full filter lifecycle (CRUD, apply-vs-preview). Filters apply immediately with no state
machine.

No News Message taxonomy hole was found — messages are already categorized (board/season/transfer/
result/development) and no unticketed gap was discovered. The `CONTEXT.md` News Message and News Inbox
terms were used; no parallel vocabulary was introduced.

Two recurring patterns worth noting for the larger map:
1. The lightweight state model (no shelved view across refresh, no `bulk_editing` state) is consistent
   with Screen 22's per-read composition — each feature decides independently rather than converging
   on one shared state machine.
2. The decisions these gaps point at (saved filter presets, entity links on messages, an action model
   wider than transfers) are each small enough for a Group B spec row rather than a new wayfinder
   ticket — the fog they came from has cleared.
