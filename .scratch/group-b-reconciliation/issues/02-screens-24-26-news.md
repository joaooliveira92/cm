# 02 — Screens 24, 25, 26: audit the News Inbox

Type: grilling

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
