import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import type { SecondaryTab } from "../spec-nav-config.js";
import {
  entityTabConfigForType,
  type EntityType,
} from "../entity-nav-config.js";
import {
  matchTabConfigForContext,
  type MatchConditionalTab,
  type MatchContext,
} from "../match-nav-config.js";
import { parseNavState, resolveEntityTabId, resolveMatchTabId } from "../nav-route-parser.js";
import { FOCUS_RING } from "../../focus.js";
import { NO_DRAG } from "../../chrome/header/drag-region.js";

/**
 * The contextual tab row, for the two contexts the sidebar cannot express: an
 * entity profile and a match.
 *
 * It used to render a third thing as well — a tab per primary section — which put
 * two different vocabularies for the same idea on screen at once: the sidebar's
 * Squad submenu (Squad, Staff, Information, Finances, …) above this row's Squad
 * tabs (First Team, Reserves, Under-19s, …), most of which resolved to no
 * destination at all. The sidebar owns section navigation now, so this row renders
 * only where a section has nothing to say: inside a player or staff profile, and
 * inside a match.
 *
 * Which is also why it is not called the secondary nav any more. In this game the
 * secondary navigation is a section's own item list, and that lives in the sidebar.
 */
export interface ContextTabsProps {
  readonly onChangeTab?: (navId: EntityType | MatchContext, tabId: string) => void;
  readonly matchTabVisibility?: Partial<Record<string, boolean>>;
}

const matchContextLabel = (context: MatchContext): string => {
  switch (context) {
    case "pre-match":
      return "Pre-match";
    case "live-match":
      return "Live Match";
    case "post-match":
      return "Post-match";
  }
};

const TabButton = ({
  tab,
  active,
  onSelect,
}: {
  readonly tab: SecondaryTab;
  readonly active: boolean;
  readonly onSelect: (tabId: string) => void;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    aria-current={active ? "page" : undefined}
    tabIndex={active ? 0 : -1}
    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-control px-3 whitespace-nowrap text-body transition-colors ${
 active
 ? "bg-surface-raised font-medium text-text-primary"
 : "text-text-secondary hover:bg-surface hover:text-text-primary"
 } ${FOCUS_RING.join(" ")}`}
    onClick={() => onSelect(tab.id)}
  >
    {tab.label}
  </button>
);

export const ContextTabs = ({ onChangeTab, matchTabVisibility }: ContextTabsProps) => {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const parsed = useMemo(
    () => parseNavState(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const { entityType, matchContext } = parsed;
  const rawTabId = parsed.activeTabId;

  const entityConfig = useMemo(
    () => (entityType !== null ? entityTabConfigForType(entityType) : null),
    [entityType],
  );

  const matchConfig = useMemo(
    () => (matchContext !== null ? matchTabConfigForContext(matchContext) : null),
    [matchContext],
  );

  const tabs: ReadonlyArray<SecondaryTab> = useMemo(() => {
    if (entityConfig !== null) return entityConfig.tabs;
    if (matchConfig !== null) {
      return matchConfig.tabs.filter((tab) => {
        if ("visible" in tab) {
          const conditional = tab as MatchConditionalTab;
          return conditional.visible(matchTabVisibility?.[tab.id]);
        }
        return true;
      });
    }
    return [];
  }, [entityConfig, matchConfig, matchTabVisibility]);

  const resolvedTabId = useMemo(() => {
    if (entityConfig !== null) {
      return resolveEntityTabId(entityConfig.entityType, rawTabId);
    }
    if (matchConfig !== null) {
      const candidate = resolveMatchTabId(matchConfig.matchContext, rawTabId);
      const exists = tabs.some((t) => t.id === candidate);
      return exists ? candidate : matchConfig.defaultTab;
    }
    return null;
  }, [entityConfig, matchConfig, rawTabId, tabs]);

  // The context the tabs belong to. It names the tablist, so it must be the entity
  // or the match phase — never the primary section the route happens to fall under.
  const contextName = entityConfig !== null
    ? `${entityConfig.entityType.charAt(0).toUpperCase()}${entityConfig.entityType.slice(1)}`
    : matchConfig !== null
      ? matchContextLabel(matchConfig.matchContext)
      : null;
  const label = contextName !== null ? `${contextName} tabs` : null;

  const tabListRef = useRef<HTMLDivElement | null>(null);

  const [focusedTabIndex, setFocusedTabIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    const activeEl = tabListRef.current?.querySelector<HTMLButtonElement>(
      '[aria-current="page"]',
    );
    if (typeof activeEl?.scrollIntoView === "function") {
      activeEl.scrollIntoView({
        behavior: "instant",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [resolvedTabId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (tabs.length === 0) return;
      const currentIndex = focusedTabIndex ?? tabs.findIndex((t) => t.id === resolvedTabId);
      let nextIndex: number | null = null;

      switch (event.key) {
        case "ArrowRight":
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case "ArrowLeft":
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      if (nextIndex !== null) {
        setFocusedTabIndex(nextIndex);
        const tabEl = tabListRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="tab"]',
        )[nextIndex];
        tabEl?.focus();
      }
    },
    [tabs, focusedTabIndex, resolvedTabId],
  );

  const handleTabSelect = useCallback(
    (tabId: string) => {
      if (onChangeTab === undefined) return;
      const navId = matchConfig !== null ? matchConfig.matchContext : entityConfig?.entityType;
      if (navId !== undefined) onChangeTab(navId, tabId);
    },
    [entityConfig, matchConfig, onChangeTab],
  );

  if (label === null || tabs.length === 0) {
    return null;
  }

  const hasOverflow = tabs.length > 6;

  return (
    <nav
      aria-label={label}
      className={`flex h-11 w-full shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-raised text-body ${
 hasOverflow
 ? "overflow-x-auto [mask-image:linear-gradient(to_right,transparent_0,black_16px,black_calc(100%-16px),transparent_100%)]"
 : ""
 }`}
      style={NO_DRAG}
    >
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={contextName ?? undefined}
        className={`flex min-w-0 flex-1 items-center gap-0.5 px-2.5 ${
          hasOverflow ? "" : "overflow-x-auto"
        }`}
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={tab.id === resolvedTabId}
            onSelect={handleTabSelect}
          />
        ))}
      </div>
    </nav>
  );
};
