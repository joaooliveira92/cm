# Screen 32: Manager Chat and Multiplayer Communication

> **Clean-room notice:** This specification describes an original football-management simulation workflow inspired by early-2000s management games. Use original interface text, visual design, and fictional or properly licensed data.

---

## 1. Purpose

The Manager Chat and Multiplayer Communication screen provides career-scoped communication among authorized participants while keeping chat separate from canonical football commands and manager-private game data.

## 2. Primary user goals

- View career lobby and manager-presence information.
- Send and receive authorized text messages.
- Use public career, team, direct, and system channels where supported.
- Mute, block, or report participants according to policy.
- Review connection and delivery state.
- Open shared safe entity links without leaking private knowledge.

## 3. Position in the navigation model

```text
Global Application Shell
  -> Manager Chat and Multiplayer Communication
  -> Related entity or workflow
  -> Return to prior safe screen
```

The screen must preserve the active manager, career revision, navigation history, and permission context.

## 4. Conceptual layout

```text
+------------------------------------------------------------------------------+
| MULTIPLAYER COMMUNICATION                           Connected: 4 of 4        |
|------------------------------------------------------------------------------|
| Channels              | Career Chat                                          |
| # Career              | Jamie: Ready to continue?                            |
| # Match Discussion    | Joao: Reviewing the squad now.                       |
| Direct Messages       | System: Participant 3 is ready.                      |
| System                |                                                      |
|                       |                                                      |
|                       |                                                      |
|------------------------------------------------------------------------------|
| [Message________________________________________________________]    [Send]  |
| [Participants] [Ready Status] [Mute] [Report]                        [Back]  |
+------------------------------------------------------------------------------+
```

The diagram defines information hierarchy and behavior rather than exact pixel placement.

## 5. Information architecture

The interface should use persistent headings, clearly labeled controls, a predictable content region, and an explicit status area. Data-heavy lists must support stable sorting, keyboard traversal, and virtualized rendering where necessary.

## 6. Core data model

```typescript
interface MultiplayerMessage {
  readonly messageId: string;
  readonly careerId: string;
  readonly channelId: string;
  readonly senderParticipantId?: string;
  readonly senderManagerId?: string;
  readonly sentAt: string;
  readonly content: PlainTextMessageContent;
  readonly deliveryState: "sending" | "sent" | "delivered" | "failed";
  readonly systemMessageTypeId?: string;
  readonly safeEntityLinks: readonly SafeEntityLink[];
  readonly moderationState: "visible" | "hidden" | "removed";
}
```

Renderer-facing models must be serializable, immutable per revision, and validated at the process or network boundary.

## 7. Principal interactions

- Select a permitted channel.
- Send a bounded plain-text message.
- Retry a failed send without duplication.
- Mute or block a participant locally.
- Report a message through the configured moderation workflow.
- Set ready status separately from chat.
- Open safe shared entity links.

## 8. Screen and operation states

- `connecting`
- `online`
- `degraded`
- `offline`
- `sending`
- `rate_limited`
- `permission_changed`
- `history_unavailable`

Every asynchronous operation must expose a visible state, support cancellation where safe, and discard stale responses by revision or request fingerprint.

## 9. Navigation behavior

- Back returns to the prior safe route and restores logical focus.
- Direct entity links use stable IDs rather than display names.
- Deleted or inaccessible entities produce a safe unavailable state.
- Unsafe transient dialogs and partially completed transactions are not restored after load.
- Navigation history is manager-scoped in hot-seat and multiplayer careers.

## 10. Permissions and multiplayer behavior

- The active manager determines what private data can be displayed.
- Shared career data comes from the authoritative host or server revision.
- Client rendering state never grants permissions.
- Manager switching clears private transient content before the next manager gains control.
- Remote changes refresh affected content without silently overwriting local drafts.

## 11. Validation and error handling

- Validate route parameters, entity IDs, revisions, filters, and actions in a trusted layer.
- Preserve the last valid view when refresh fails.
- Distinguish empty, unavailable, permission-denied, offline, conflicted, and failed states.
- Give corrective actions such as Retry, Clear Filters, Return, or Open Recovery.
- Never display raw stack traces, credentials, private paths, or provider secrets.

## 12. Accessibility requirements

- Support complete keyboard operation and visible focus.
- Use headings, landmarks, list or grid semantics, and persistent form labels.
- Announce meaningful state changes without announcing every incremental update.
- Never communicate status by color alone.
- Support reduced motion, high contrast, 200 percent text scaling, and right-to-left layouts.
- Restore focus after dialogs, drawers, and linked detail screens close.

## 13. Localization requirements

- Localize labels, statuses, dates, times, numbers, currencies, durations, and plural forms.
- Preserve stable IDs independently from translated display names.
- Apply locale-aware search and sorting.
- Preserve native scripts, accents, and manager-selected name order.
- Use complete message templates rather than concatenated translated fragments.

## 14. Responsive behavior

- Wide desktop may use list-and-detail or multi-column layouts.
- Standard desktop should prioritize primary data over decorative regions.
- Narrow windows should stack filters, content, details, and actions.
- High text scaling must preserve labels, controls, warnings, and primary actions.
- Ultrawide layouts should use readable maximum widths instead of stretching rows excessively.

## 15. Performance requirements

- Virtualize long lists.
- Debounce search and expensive filters.
- Cancel stale requests.
- Preserve stable row identity and scroll position.
- Keep heavy queries and transformations outside the renderer.
- Rate-limit live updates and progress events.
- Avoid transporting complete world graphs when a compact read model is sufficient.

## 16. Security and privacy requirements

- Authenticate every sender and channel membership.
- Use server-assigned message IDs and idempotency keys.
- Render chat as plain text or constrained blocks.
- Prevent chat messages from executing football commands.
- Rate-limit sending and protect against spam.
- Do not reveal private scouting or inbox entities through shared links.
- Keep moderation records and privacy disclosures policy-driven.

## 17. Persistence rules

Persist only durable user preferences, safe navigation bookmarks, manager-scoped drafts, and authoritative career state. Do not persist transient hover state, unsafe dialogs, unvalidated filters, plaintext secrets, or stale permission decisions.

## 18. Observability

Record operation duration, result category, revision conflicts, and safe diagnostic codes. Avoid recording private message content, full manager names, authentication data, arbitrary user notes, or complete local paths in general telemetry.

## 19. Edge cases

- The active manager changes while the screen is open.
- The selected entity is deleted or becomes inaccessible.
- The career revision advances during an asynchronous request.
- The host disconnects or migrates.
- Filters hide the currently selected item.
- The application resumes after sleep or network loss.
- The same action is submitted twice.
- A late response arrives after navigation away.

## 20. Acceptance criteria

1. Only authorized participants can read or send in a channel.
2. Messages have clear delivery state.
3. Retries do not duplicate messages.
4. Chat cannot mutate canonical football state.
5. Ready status is separate from chat text.
6. Mute, block, and report actions function according to policy.
7. Private information is not leaked through links or previews.
8. Keyboard and screen-reader chat operation is complete.
9. No proprietary chat assets or wording are required.

## 21. Recommended tests

- Career channel.
- Direct message.
- Offline reconnect.
- Failed send retry.
- Rate limiting.
- Mute and block.
- Report workflow.
- Unsafe link rejection.
- Keyboard chat navigation.

## 22. Condensed LLM implementation brief

```text
Implement Manager Chat and Multiplayer Communication as part of the global navigation and inbox
system of an original football-management simulation. Use compact immutable read
models, stable IDs, permission-aware queries, revision-bound asynchronous
operations, safe navigation history, virtualized data-heavy views, deterministic
state transitions, and authoritative server or application validation. Preserve
manager privacy in hot-seat and network careers. Support keyboard navigation,
screen-reader semantics, visible focus, high text scaling, localization, and
right-to-left layouts. Treat all database labels, user content, network payloads,
route parameters, and renderer commands as untrusted. Do not copy proprietary
artwork, exact wording, source code, logos, or databases.
```

## 23. Next planned item

**Group C: Club Information, beginning with Screen 33: Club Overview**

## Suggested Git commit

```text
docs(game-ui): specify multiplayer communication screen
```
