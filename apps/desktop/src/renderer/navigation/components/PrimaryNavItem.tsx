import { useSyncExternalStore } from "react";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import { FOCUS_RING } from "../../focus.js";
import { intentOfClick } from "../adapter.js";
import { useNavContext } from "../navContext.js";
import type { NavItem, NavSection } from "../nav-config.js";
import { NAV_SECTIONS } from "../nav-config.js";
import { getScopeState, subscribeScopeState } from "../../actions/scopeState.js";

export const PrimaryNavItem = ({
  section,
  badgeCount,
  badgeLabel,
  children,
}: {
  readonly section: NavSection;
  readonly badgeCount?: number | undefined;
  readonly badgeLabel?: string | undefined;
  readonly children: ReadonlyArray<NavItem>;
}) => {
  const { state, actions } = useNavContext();
  const active = state.activeSectionId === section.id;
  const submenuOpen = state.isSubmenuVisible(section.id);
  const Icon = section.icon;
  const hasChildren = children.length > 0;

  const scope = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);
  const hintKey = scope.prefixActive === true && scope.prefixKind === "level0"
    ? String(NAV_SECTIONS.indexOf(section) + 1)
    : undefined;

  return (
    <div
      className="relative flex h-10 shrink-0 items-center"
      onMouseEnter={() => actions.handleSectionEnter(section.id)}
      onMouseLeave={actions.handleSectionLeave}
    >
      <ShortcutHint hintKey={hintKey}>
        <div
          className={`flex items-center gap-1.5 rounded-control pl-3 pr-1 text-sm transition-colors ${
            active
              ? "chrome-gradient-inverted border border-panel-border-dark font-semibold"
              : "bg-surface text-text-secondary hover:bg-surface-raised hover:text-text-primary"
          } ${FOCUS_RING.join(" ")}`}
        >
          <button
            type="button"
            aria-current={active ? "page" : undefined}
            className="flex items-center gap-1.5 whitespace-nowrap py-1"
            onClick={(event) => actions.goTo(section.defaultDestination, intentOfClick(event))}
          >
            {Icon !== undefined && <Icon className="size-4" />}
            <span>{section.label}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span
                aria-label={`${badgeCount} ${badgeLabel ?? "unread"}`}
                className="ml-0.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.625rem] font-semibold leading-4 text-white tabular-nums"
              >
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>
          {hasChildren && (
            <button
              type="button"
              aria-label={`Toggle ${section.label} submenu`}
              aria-expanded={submenuOpen}
              aria-controls={`submenu-${section.id}`}
              className={`flex size-4 items-center justify-center text-xs transition-transform ${
                submenuOpen ? "rotate-180" : ""
              }`}
              onClick={() => actions.handleToggleSubmenu(section.id)}
            >
              ▾
            </button>
          )}
        </div>
      </ShortcutHint>
      {active && (
        <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-focus-ring" />
      )}
    </div>
  );
};