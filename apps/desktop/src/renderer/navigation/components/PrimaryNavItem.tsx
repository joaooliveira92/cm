import { FOCUS_RING } from "../../focus.js";
import type { NavItem, NavSection } from "../nav-config.js";

/**
 * The primary-level navigation item: one section in the center zone.
 *
 * The item is two adjacent controls (never nested buttons): the label button
 * navigates to the section's default route, and the chevron button toggles the
 * context submenu. Hovering the container starts the preview intent via
 * `onMouseEnter`/`onMouseLeave`.
 */
export const PrimaryNavItem = ({
  section,
  active,
  submenuOpen,
  children,
  onNavigate,
  onToggleSubmenu,
  onMouseEnter,
  onMouseLeave,
}: {
  readonly section: NavSection;
  readonly active: boolean;
  readonly submenuOpen: boolean;
  readonly children: ReadonlyArray<NavItem>;
  readonly onNavigate: () => void;
  readonly onToggleSubmenu: () => void;
  readonly onMouseEnter: () => void;
  readonly onMouseLeave: () => void;
}) => {
  const Icon = section.icon;
  const hasChildren = children.length > 0;

  return (
    <div
      className="relative flex h-10 shrink-0 items-center"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
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
          onClick={onNavigate}
        >
          {Icon !== undefined && <Icon className="size-4" />}
          <span>{section.label}</span>
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
            onClick={onToggleSubmenu}
          >
            ▾
          </button>
        )}
      </div>
      {active && (
        <span className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-focus-ring" />
      )}
    </div>
  );
};
