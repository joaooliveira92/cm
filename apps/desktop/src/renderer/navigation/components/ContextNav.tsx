import { FOCUS_RING, type NavigationIntent } from "../../focus.js";
import { intentOfClick } from "../adapter.js";
import type { NavItem, NavSection } from "../nav-config.js";

/**
 * The context submenu strip: the second row of the navbar showing the active
 * (or previewed) section's items. This is the "persistent contextual strip"
 * pattern from the spec (§4), visible for the active section and swapped to the
 * previewed section when the pointer hovers another primary item.
 *
 * Each item is a real link-button that navigates to its destination and closes
 * transient previews.
 */
export const ContextNav = ({
  section,
  items,
  activeItemId,
  onNavigate,
  onMouseEnter,
  onMouseLeave,
}: {
  readonly section: NavSection | null;
  readonly items: ReadonlyArray<NavItem>;
  readonly activeItemId: string | null;
  readonly onNavigate: (
    destination: (typeof items)[number]["destination"],
    intent: NavigationIntent,
  ) => void;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
}) => {
  if (section === null) return null;

  return (
    <nav
      id={`submenu-${section.id}`}
      aria-label={`${section.label} submenu`}
      className="flex h-11 items-center gap-1 border-b border-border-subtle bg-bg-raised px-2 text-sm"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="mr-2 shrink-0 text-xs uppercase tracking-wide text-text-muted">
        {section.label}
      </span>
      {items.map((item) => {
        const active = item.id === activeItemId;
        const ItemIcon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-control px-3 whitespace-nowrap transition-colors ${
              active
                ? "bg-surface-raised font-medium text-text-primary"
                : "text-text-secondary hover:bg-surface hover:text-text-primary"
            } ${FOCUS_RING.join(" ")}`}
            onClick={(event) => onNavigate(item.destination, intentOfClick(event))}
          >
            {ItemIcon !== undefined && <ItemIcon className="size-3.5" />}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
};
