import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  sectionById,
  isTabVisible,
  type SpecSectionId,
  type SecondaryTab,
} from "../spec-nav-config.js";
import {
  entityTabConfigForType,
  type EntityType,
} from "../entity-nav-config.js";
import { parseNavState, resolveActiveTabId, resolveEntityTabId } from "../nav-route-parser.js";
import { FOCUS_RING } from "../../focus.js";
import { NO_DRAG } from "../../chrome/header/drag-region.js";

export interface SecondaryNavProps {
  readonly competitionType?: string;
  readonly onChangeTab?: (sectionId: SpecSectionId | EntityType, tabId: string) => void;
}

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
    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-control px-3 whitespace-nowrap text-sm transition-colors ${
      active
        ? "bg-surface-raised font-medium text-text-primary"
        : "text-text-secondary hover:bg-surface hover:text-text-primary"
    } ${FOCUS_RING.join(" ")}`}
    onClick={() => onSelect(tab.id)}
  >
    {tab.label}
  </button>
);

export const SecondaryNav = ({
  competitionType,
  onChangeTab,
}: SecondaryNavProps) => {
  const location = useLocation();
  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const parsed = useMemo(
    () => parseNavState(location.pathname, searchParams),
    [location.pathname, searchParams],
  );

  const section = useMemo(() => {
    if (parsed.primarySection !== null) return parsed.primarySection;
    if (parsed.originSectionId !== null) return sectionById(parsed.originSectionId) ?? null;
    return null;
  }, [parsed.primarySection, parsed.originSectionId]);

  const rawTabId = parsed.activeTabId;

  const entityConfig = useMemo(
    () => (entityType !== null ? entityTabConfigForType(entityType) : null),
    [entityType],
  );

  const tabs: ReadonlyArray<SecondaryTab> = useMemo(() => {
    if (entityConfig !== null) return entityConfig.tabs;
    if (section === null) return [];
    return section.tabs.filter((tab) => isTabVisible(tab, competitionType));
  }, [entityConfig, section, competitionType]);

  const resolvedTabId = useMemo(() => {
    if (entityConfig !== null) {
      return resolveEntityTabId(entityConfig.entityType, rawTabId);
    }
    if (section === null) return null;
    const candidate = resolveActiveTabId(section, rawTabId);
    const exists = tabs.some((t) => t.id === candidate);
    return exists ? candidate : section.defaultTab;
  }, [entityConfig, section, rawTabId, tabs]);

  const label = entityConfig !== null
    ? `${entityConfig.entityType.charAt(0).toUpperCase()}${entityConfig.entityType.slice(1)} tabs`
    : section !== null
      ? `${section.label} tabs`
      : null;

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
      if (onChangeTab !== undefined) {
        const navId: SpecSectionId | EntityType = entityConfig !== null
          ? entityConfig.entityType
          : (section?.id ?? "squad") as SpecSectionId;
        onChangeTab(navId, tabId);
      }
    },
    [section, entityConfig, onChangeTab],
  );

  if (label === null || tabs.length === 0) {
    return null;
  }

  const hasOverflow = tabs.length > 6;

  return (
    <nav
      aria-label={label}
      className={`flex h-11 w-full shrink-0 items-center gap-1 border-b border-border-subtle bg-bg-raised text-sm ${
        hasOverflow
          ? "overflow-x-auto [mask-image:linear-gradient(to_right,transparent_0,black_16px,black_calc(100%-16px),transparent_100%)]"
          : ""
      }`}
      style={NO_DRAG}
    >
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={section?.label ?? label}
        className={`flex min-w-0 flex-1 items-center gap-0.5 px-2.5 ${
          hasOverflow ? "" : "overflow-x-auto"
        }`}
        onKeyDown={handleKeyDown}
      >
        {entityConfig === null && section?.contextSelector !== undefined && (
          <span className="mr-1 flex shrink-0 items-center gap-1 rounded-control border border-border-subtle px-2 py-1 text-xs text-text-secondary">
            <span className="font-medium">{section.contextSelector.label}</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        )}

        {tabs.map((tab) => {
          const isActive = tab.id === resolvedTabId;
          return (
            <TabButton
              key={tab.id}
              tab={tab}
              active={isActive}
              onSelect={handleTabSelect}
            />
          );
        })}
      </div>
    </nav>
  );
};
