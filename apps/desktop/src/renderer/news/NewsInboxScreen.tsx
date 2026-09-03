import type { NewsCategory, NewsView } from "@cm-clone/shared";
import { EMPTY_NEWS_FILTER, NEWS_CATEGORIES, filterNews } from "@cm-clone/shared";
import type { NewsMessageView, SaveId } from "@cm-clone/contracts";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { FOCUS_RING } from "../focus.js";
import { PANEL } from "../theme.js";
import {
  describeRpcError,
  newsInboxAtom,
  setNewsMessageStateMutation,
  typedError,
  useAtom,
  useAtomValue,
} from "../rpc.js";
import {
  bulkTargets,
  edgeSelection,
  isNarrowed,
  resolveSelection,
  stepSelection,
  toggleCategory,
} from "./inboxState.js";

/**
 * News Inbox (Screens 24-26) — the career's event streams read as messages, with the message pane
 * (Screen 25) and the filter bar (Screen 26) in the same screen rather than as separate routes.
 *
 * List-and-detail in one route is what Screen 24 §14 asks for on a desktop width, and it is what
 * makes §7's "open a message without losing inbox position" free rather than a restoration problem:
 * the list never unmounts, so there is no position to restore.
 *
 * Filtering is client-side over an already-loaded inbox. A career's narrative is a few hundred
 * messages over twenty seasons, so §15's debounce and virtualization would be machinery guarding
 * a cost that is not there; the filter runs synchronously in a `useMemo` and the list renders whole.
 * Both become real if the inbox ever grows per-fixture messages, and the seam for that is
 * `filterNews` already being a pure function over the full set.
 */

const VIEW_TABS: ReadonlyArray<{ readonly view: NewsView; readonly label: string }> = [
  { view: "all", label: "All" },
  { view: "unread", label: "Unread" },
  { view: "flagged", label: "Flagged" },
  { view: "archived", label: "Archived" },
];

/** Player-facing category names. UI vocabulary, so it lives in the renderer — the stable ids are
 *  what filter state and the contract carry. */
const CATEGORY_LABELS: Record<NewsCategory, string> = {
  board: "Board",
  season: "Season",
  transfer: "Transfers",
  result: "Results",
  development: "Development",
};

/** The in-world position of a message. The Calendar has no dates yet, so a message is placed by
 *  season and matchday; this is the one place that formatting lives. */
const whenLabel = (message: NewsMessageView): string => {
  if (message.matchday !== null) return `Matchday ${message.matchday}`;
  if (message.seasonNumber !== null) return `Season ${message.seasonNumber}`;
  return "—";
};

/**
 * One row. State is carried by text as well as by weight and the leading dot, never by colour
 * alone (§12): an unread row says "Unread", a flagged row says "Flagged", a high-priority row
 * carries a "Priority" badge.
 */
const MessageRow = ({
  message,
  selected,
  onSelect,
}: {
  readonly message: NewsMessageView;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) => (
  <div
    role="option"
    id={`news-row-${message.messageId}`}
    aria-selected={selected}
    onClick={onSelect}
    className={`cursor-pointer border-b border-border px-3 py-2 ${
      selected ? "bg-accent" : "hover:bg-accent/50"
    }`}
  >
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={`truncate ${message.state === "unread" ? "font-semibold text-text-primary" : "text-text-body"}`}
      >
        {message.state === "unread" && <span aria-hidden="true">• </span>}
        {message.subject}
      </span>
      <span className="shrink-0 text-xs tabular-nums text-text-secondary">
        {whenLabel(message)}
      </span>
    </div>
    <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
      <span>{CATEGORY_LABELS[message.category]}</span>
      <span>
        {message.state === "unread" ? "Unread" : message.state === "read" ? "Read" : "Archived"}
      </span>
      {message.flagged && <span>Flagged</span>}
      {message.priority === "high" && <Badge variant="destructive">Priority</Badge>}
    </div>
  </div>
);

/** Screen 25 — the message pane. Subject and body are rendered as text, never as markup: they are
 *  built from database labels the projection interpolates, and §16 treats those as untrusted. */
const MessagePane = ({
  message,
  onToggleRead,
  onToggleFlag,
  onToggleArchive,
  pending,
}: {
  readonly message: NewsMessageView;
  readonly onToggleRead: () => void;
  readonly onToggleFlag: () => void;
  readonly onToggleArchive: () => void;
  readonly pending: boolean;
}) => (
  <Card className="flex h-full flex-col px-4 py-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold text-text-primary">{message.subject}</h2>
      {message.priority === "high" && <Badge variant="destructive">Priority</Badge>}
    </div>
    <p className="mt-1 text-xs text-text-secondary">
      {CATEGORY_LABELS[message.category]} · {whenLabel(message)}
    </p>
    <p className="mt-4 flex-1 text-sm leading-relaxed text-text-body">{message.body}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="secondary" disabled={pending} onClick={onToggleRead}>
        {message.state === "read" ? "Mark unread" : "Mark read"}
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={onToggleFlag}>
        {message.flagged ? "Unflag" : "Flag"}
      </Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={onToggleArchive}>
        {message.state === "archived" ? "Restore" : "Archive"}
      </Button>
    </div>
  </Card>
);

export const NewsInboxScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const inboxResult = useAtomValue(newsInboxAtom(saveId));
  const [patchState, runPatch] = useAtom(setNewsMessageStateMutation);

  const [filter, setFilter] = useState(EMPTY_NEWS_FILTER);
  const [requestedId, setRequestedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const messages = inboxResult._tag === "Success" ? inboxResult.value.messages : [];
  const visible = useMemo(() => filterNews(messages, filter), [messages, filter]);

  // The selection is derived rather than stored, so a refresh that appends messages above the
  // selected one cannot move it, and a filter that hides it cannot leave the pane pointing at a
  // message the manager can no longer see.
  const selectedId = resolveSelection(visible, requestedId);
  const selected = visible.find((message) => message.messageId === selectedId) ?? null;

  const loadError = typedError(inboxResult);
  if (loadError) return <p className="p-8 text-destructive">{describeRpcError(loadError)}</p>;
  if (inboxResult._tag === "Initial")
    return <p className="p-8 text-text-secondary">Loading news...</p>;
  if (inboxResult._tag === "Failure")
    return <p className="p-8 text-destructive">Failed to load news.</p>;

  const counts = inboxResult.value.counts;
  const patchError = typedError(patchState);
  const pending = patchState.waiting;

  const patch = (
    messageIds: ReadonlyArray<string>,
    fields: { readonly read?: boolean; readonly archived?: boolean; readonly flagged?: boolean },
  ) => {
    if (messageIds.length === 0 || pending) return;
    runPatch({ saveId, messageIds: messageIds as never, patch: fields });
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const move = (next: string | null) => {
      event.preventDefault();
      setRequestedId(next);
    };
    switch (event.key) {
      case "ArrowDown":
        return move(stepSelection(visible, selectedId, 1));
      case "ArrowUp":
        return move(stepSelection(visible, selectedId, -1));
      case "Home":
        return move(edgeSelection(visible, "first"));
      case "End":
        return move(edgeSelection(visible, "last"));
      case "Enter":
      case " ":
        if (selected !== null && selected.state === "unread") {
          event.preventDefault();
          patch([selected.messageId], { read: true });
        }
        return;
      default:
        return;
    }
  };

  return (
    <main
      tabIndex={-1}
      aria-label="News Inbox"
      className={`bg-background p-6 text-foreground ${FOCUS_RING.join(" ")}`}
    >
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">News</h1>
        {/* Counts are announced politely and describe the whole inbox, not the filtered result —
            narrowing the list must not appear to change how much news there is. */}
        <p aria-live="polite" className="text-sm text-text-secondary">
          {counts.unread} unread of {counts.total}
          {counts.highPriorityUnread > 0 && ` · ${counts.highPriorityUnread} needing attention`}
          {inboxResult.waiting && " · Refreshing…"}
        </p>
      </header>

      {/* Screen 26 — filters. */}
      <section aria-label="Filters" className="mt-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Inbox view" className="flex gap-1">
          {VIEW_TABS.map((tab) => (
            <Button
              key={tab.view}
              role="tab"
              type="button"
              aria-selected={filter.view === tab.view}
              variant={filter.view === tab.view ? "default" : "secondary"}
              onClick={() => setFilter({ ...filter, view: tab.view })}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        <div role="group" aria-label="Categories" className="flex flex-wrap gap-1">
          {NEWS_CATEGORIES.map((category) => (
            <Button
              key={category}
              type="button"
              aria-pressed={filter.categories.includes(category)}
              variant={filter.categories.includes(category) ? "default" : "secondary"}
              onClick={() =>
                setFilter({ ...filter, categories: toggleCategory(filter.categories, category) })
              }
            >
              {CATEGORY_LABELS[category]}
            </Button>
          ))}
        </div>
        <Input
          type="search"
          aria-label="Search news"
          placeholder="Search news"
          value={filter.search}
          onChange={(event) => setFilter({ ...filter, search: event.target.value })}
          className="w-56"
        />
        {isNarrowed(filter) && (
          <Button type="button" variant="secondary" onClick={() => setFilter(EMPTY_NEWS_FILTER)}>
            Clear filters
          </Button>
        )}
      </section>

      <section aria-label="Bulk actions" className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending || bulkTargets(visible, "read").length === 0}
          onClick={() => patch(bulkTargets(visible, "read"), { read: true })}
        >
          Mark all read ({bulkTargets(visible, "read").length})
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || bulkTargets(visible, "archive").length === 0}
          onClick={() => patch(bulkTargets(visible, "archive"), { archived: true })}
        >
          Archive all ({bulkTargets(visible, "archive").length})
        </Button>
      </section>

      {patchError !== null && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {describeRpcError(patchError)}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-6 text-text-secondary">
          {isNarrowed(filter)
            ? "No messages match these filters."
            : "No news yet. Press Continue to advance the season."}
        </p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
          <div
            ref={listRef}
            role="listbox"
            tabIndex={0}
            aria-label="Messages"
            aria-activedescendant={selectedId === null ? undefined : `news-row-${selectedId}`}
            onKeyDown={onListKeyDown}
            className={`max-h-[32rem] overflow-y-auto rounded-md border border-border ${PANEL} ${FOCUS_RING.join(" ")}`}
          >
            {visible.map((message) => (
              <MessageRow
                key={message.messageId}
                message={message}
                selected={message.messageId === selectedId}
                onSelect={() => {
                  setRequestedId(message.messageId);
                  if (message.state === "unread") patch([message.messageId], { read: true });
                }}
              />
            ))}
          </div>

          {selected !== null && (
            <MessagePane
              message={selected}
              pending={pending}
              onToggleRead={() =>
                patch([selected.messageId], { read: selected.state !== "read" })
              }
              onToggleFlag={() => patch([selected.messageId], { flagged: !selected.flagged })}
              onToggleArchive={() =>
                patch([selected.messageId], { archived: selected.state !== "archived" })
              }
            />
          )}
        </div>
      )}
    </main>
  );
};
