import type { NewsCategory, NewsFilter, NewsView } from "@cm-clone/shared";
import { EMPTY_NEWS_FILTER, NEWS_CATEGORIES, filterNews, formatCalendarDate } from "@cm-clone/shared";
import type { NewsMessageView, SaveId } from "@cm-clone/contracts";
import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { FOCUS_RING } from "../focus.js";
import { navigate } from "../navigation/adapter.js";
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
  withSearch,
  withView,
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
  { view: "action", label: "Action required" },
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

/** The in-world position of a message: the date it happened on, or the season for a message the
 *  calendar does not place on a day. This is the one place that formatting lives. */
const whenLabel = (message: NewsMessageView): string => {
  if (message.date !== null) return formatCalendarDate(message.date);
  if (message.seasonNumber !== null) return `Season ${message.seasonNumber}`;
  return "—";
};

/** A message-state patch as the screen issues it: the target ids plus the fields to set. Ids are
 *  plain strings at this edge — `bulkTargets` produces unbranded ids — which is why the single
 *  `runPatch` call site still needs its cast. */
type PatchFn = (
  messageIds: ReadonlyArray<string>,
  fields: { readonly read?: boolean; readonly archived?: boolean; readonly flagged?: boolean },
) => void;

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
        className={`truncate ${message.state === "unread" ? "font-semibold text-text-primary" : "text-text-soft"}`}
      >
        {message.state === "unread" && <span aria-hidden="true">• </span>}
        {message.subject}
      </span>
      <span className="shrink-0 text-data tabular-nums text-text-secondary">
        {whenLabel(message)}
      </span>
    </div>
    <div className="mt-1 flex items-center gap-2 text-data text-text-secondary">
      <span>{CATEGORY_LABELS[message.category]}</span>
      <span>
        {message.state === "unread" ? "Unread" : message.state === "read" ? "Read" : "Archived"}
      </span>
      {message.flagged && <span>Flagged</span>}
      {message.actionState === "required" ? (
        <Badge variant="destructive">Action required</Badge>
      ) : (
        message.priority === "high" && <Badge variant="destructive">Priority</Badge>
      )}
      {message.actionState === "expired" && <span>Lapsed</span>}
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
  onOpenTransfers,
  pending,
}: {
  readonly message: NewsMessageView;
  readonly onToggleRead: () => void;
  readonly onToggleFlag: () => void;
  readonly onToggleArchive: () => void;
  readonly onOpenTransfers: () => void;
  readonly pending: boolean;
}) => (
  <Card className="flex h-full flex-col px-4 py-3">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-heading text-text-primary">{message.subject}</h2>
      {message.actionState === "required" ? (
        <Badge variant="destructive">Action required</Badge>
      ) : (
        message.priority === "high" && <Badge variant="destructive">Priority</Badge>
      )}
    </div>
    <p className="mt-1 text-data text-text-secondary">
      {CATEGORY_LABELS[message.category]} · {whenLabel(message)}
    </p>
    <p className="mt-4 flex-1 text-body leading-relaxed text-text-soft">{message.body}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {/* The inbox reports the decision; it never resolves it. Answering a bid belongs to the
          screen that owns bids, so this routes there rather than growing a second respond surface
          whose state could disagree with the first. */}
      {message.actionState === "required" && (
        <Button type="button" onClick={onOpenTransfers}>
          Answer on Transfers
        </Button>
      )}
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

/** The frame every inbox state renders inside: one `main`, one focus target. */
const InboxShell = ({ children }: { readonly children: ReactNode }) => (
  <main
    tabIndex={-1}
    data-focus-id="news"
    aria-label="News Inbox"
    className={`p-6 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    {children}
  </main>
);

/** The screen header. Counts are announced politely and describe the whole inbox, not the filtered
 *  result — narrowing the list must not appear to change how much news there is. */
const InboxHeader = ({
  unread,
  total,
  actionRequired,
  highPriorityUnread,
  refreshing,
}: {
  readonly unread: number;
  readonly total: number;
  readonly actionRequired: number;
  readonly highPriorityUnread: number;
  readonly refreshing: boolean;
}) => (
  <header className="flex flex-wrap items-baseline justify-between gap-3">
    <h1 className="text-title">News</h1>
    <p aria-live="polite" className="text-body text-text-secondary">
      {unread} unread of {total}
      {actionRequired > 0 && ` · ${actionRequired} awaiting your answer`}
      {actionRequired === 0 &&
        highPriorityUnread > 0 &&
        ` · ${highPriorityUnread} needing attention`}
      {refreshing && " · Refreshing…"}
    </p>
  </header>
);

/** Screen 26 — the filter bar. The bar emits intents; the filter state and its transitions live in
 *  the hook, so the bar carries no transition logic of its own. */
const FilterBar = ({
  filter,
  narrowed,
  onView,
  onToggleCategory,
  onSearch,
  onClear,
}: {
  readonly filter: NewsFilter;
  readonly narrowed: boolean;
  readonly onView: (view: NewsView) => void;
  readonly onToggleCategory: (category: NewsCategory) => void;
  readonly onSearch: (search: string) => void;
  readonly onClear: () => void;
}) => (
  <section aria-label="Filters" className="mt-4 flex flex-wrap items-center gap-2">
    <div role="tablist" aria-label="Inbox view" className="flex gap-1">
      {VIEW_TABS.map((tab) => (
        <Button
          key={tab.view}
          role="tab"
          type="button"
          aria-selected={filter.view === tab.view}
          variant={filter.view === tab.view ? "default" : "secondary"}
          onClick={() => onView(tab.view)}
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
          onClick={() => onToggleCategory(category)}
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
      onChange={(event) => onSearch(event.target.value)}
      className="w-56"
    />
    {narrowed && (
      <Button type="button" variant="secondary" onClick={onClear}>
        Clear filters
      </Button>
    )}
  </section>
);

/** The bulk action bar. Eligibility and the target count come from `bulkTargets` over the visible
 *  list — the bar acts on what the manager can see, and only on what would actually change. */
const BulkActions = ({
  visible,
  pending,
  onPatch,
}: {
  readonly visible: ReadonlyArray<NewsMessageView>;
  readonly pending: boolean;
  readonly onPatch: PatchFn;
}) => {
  const readTargets = bulkTargets(visible, "read");
  const archiveTargets = bulkTargets(visible, "archive");
  return (
    <section aria-label="Bulk actions" className="mt-3 flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        disabled={pending || readTargets.length === 0}
        onClick={() => onPatch(readTargets, { read: true })}
      >
        Mark all read ({readTargets.length})
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={pending || archiveTargets.length === 0}
        onClick={() => onPatch(archiveTargets, { archived: true })}
      >
        Archive all ({archiveTargets.length})
      </Button>
    </section>
  );
};

/** The no-results branch. An empty result under active filters and an empty inbox are different
 *  situations, so they get different copy and different corrective actions. */
const EmptyState = ({
  narrowed,
  onClear,
}: {
  readonly narrowed: boolean;
  readonly onClear: () => void;
}) => (
  <div className="mt-6 text-text-secondary">
    <p>
      {narrowed
        ? "No messages match these filters."
        : "No news yet. Press Continue to advance the season."}
    </p>
    {narrowed && (
      <Button type="button" variant="secondary" className="mt-2" onClick={onClear}>
        Clear all filters
      </Button>
    )}
  </div>
);

/** The message list. A listbox whose rows carry `news-row-<id>` ids, so `aria-activedescendant`
 *  can name the selection while the rows themselves never own focus. */
const MessageList = ({
  messages,
  selectedId,
  onSelect,
  onKeyDown,
}: {
  readonly messages: ReadonlyArray<NewsMessageView>;
  readonly selectedId: string | null;
  readonly onSelect: (message: NewsMessageView) => void;
  readonly onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}) => (
  <div
    role="listbox"
    tabIndex={0}
    aria-label="Messages"
    aria-activedescendant={selectedId === null ? undefined : `news-row-${selectedId}`}
    onKeyDown={onKeyDown}
    className={`max-h-[32rem] overflow-y-auto rounded-md border border-border ${PANEL} ${FOCUS_RING.join(" ")}`}
  >
    {messages.map((message) => (
      <MessageRow
        key={message.messageId}
        message={message}
        selected={message.messageId === selectedId}
        onSelect={() => onSelect(message)}
      />
    ))}
  </div>
);

/**
 * Filter state and the derived visible list. The transitions route through the pure helpers in
 * `inboxState`, so the rules stay unit-testable without mounting the screen, and `narrowed` is
 * derived once here — both clear affordances and the empty-state copy read the same answer.
 */
const useNewsFiltering = (messages: ReadonlyArray<NewsMessageView>) => {
  const [filter, setFilter] = useState(EMPTY_NEWS_FILTER);
  const visible = useMemo(() => filterNews(messages, filter), [messages, filter]);
  return {
    filter,
    visible,
    narrowed: isNarrowed(filter),
    setView: (view: NewsView) => setFilter(withView(filter, view)),
    toggleCategory: (category: NewsCategory) =>
      setFilter({ ...filter, categories: toggleCategory(filter.categories, category) }),
    setSearch: (search: string) => setFilter(withSearch(filter, search)),
    clear: () => setFilter(EMPTY_NEWS_FILTER),
  };
};

/**
 * Selection and the listbox keyboard model. The selection is derived rather than stored, so a
 * refresh that appends messages above the selected one cannot move it, and a filter that hides it
 * cannot leave the pane pointing at a message the manager can no longer see. The arrows and
 * Home/End move within the visible set; Enter and Space open the selection, marking an unread
 * message read — the same contract a pointer click has.
 */
const useNewsSelection = (visible: ReadonlyArray<NewsMessageView>, patch: PatchFn) => {
  const [requestedId, setRequestedId] = useState<string | null>(null);

  const selectedId = resolveSelection(visible, requestedId);
  const selected = visible.find((message) => message.messageId === selectedId) ?? null;

  const openMessage = (message: NewsMessageView) => {
    setRequestedId(message.messageId);
    if (message.state === "unread") patch([message.messageId], { read: true });
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

  return { selectedId, selected, openMessage, onListKeyDown };
};

export const NewsInboxScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const inboxResult = useAtomValue(newsInboxAtom(saveId));
  const [patchState, runPatch] = useAtom(setNewsMessageStateMutation);

  const messages = inboxResult._tag === "Success" ? inboxResult.value.messages : [];
  const filtering = useNewsFiltering(messages);

  const pending = patchState.waiting;
  const patchError = typedError(patchState);
  const patch: PatchFn = (messageIds, fields) => {
    if (messageIds.length === 0 || pending) return;
    runPatch({ saveId, messageIds: messageIds as never, patch: fields });
  };

  const selection = useNewsSelection(filtering.visible, patch);

  const loadError = typedError(inboxResult);
  if (loadError)
    return (
      <InboxShell>
        <Alert variant="destructive">
          <p>{describeRpcError(loadError)}</p>
        </Alert>
      </InboxShell>
    );
  if (inboxResult._tag === "Initial")
    return (
      <InboxShell>
        <p className="p-8 text-text-secondary">Loading news...</p>
      </InboxShell>
    );
  if (inboxResult._tag === "Failure")
    return (
      <InboxShell>
        <Alert variant="destructive">
          <p>Failed to load news.</p>
        </Alert>
      </InboxShell>
    );

  const counts = inboxResult.value.counts;
  const { visible, narrowed } = filtering;
  const { selectedId, selected } = selection;

  return (
    <InboxShell>
      <InboxHeader
        unread={counts.unread}
        total={counts.total}
        actionRequired={counts.actionRequired}
        highPriorityUnread={counts.highPriorityUnread}
        refreshing={inboxResult.waiting}
      />
      <FilterBar
        filter={filtering.filter}
        narrowed={narrowed}
        onView={filtering.setView}
        onToggleCategory={filtering.toggleCategory}
        onSearch={filtering.setSearch}
        onClear={filtering.clear}
      />
      <BulkActions visible={visible} pending={pending} onPatch={patch} />
      {patchError !== null && (
        <p role="alert" className="mt-3 text-body text-destructive">
          {describeRpcError(patchError)}
        </p>
      )}
      {visible.length === 0 ? (
        <EmptyState narrowed={narrowed} onClear={filtering.clear} />
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
          <MessageList
            messages={visible}
            selectedId={selectedId}
            onSelect={selection.openMessage}
            onKeyDown={selection.onListKeyDown}
          />
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
              onOpenTransfers={() => navigate({ type: "transfers", saveId })}
            />
          )}
        </div>
      )}
    </InboxShell>
  );
};
