import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import { FOCUS_RING } from "../../focus.js";
import { intentOfClick } from "../adapter.js";
import { useNavContext } from "../navContext.js";
import { itemCarriesHint } from "../nav-route-index.js";

export const ContextNav = () => {
  const { state, actions, meta } = useNavContext();
  const { stripSection, activeItemId } = state;
  const { goTo, handleSectionEnter, handleSectionLeave } = actions;
  const { stripItems } = meta;

  if (stripSection === null) return null;

  return (
    <nav
      id={`submenu-${stripSection.id}`}
      aria-label={`${stripSection.label} submenu`}
      className="flex h-11 items-center gap-1 border-b border-border-subtle bg-bg-raised px-2 text-sm"
      onMouseEnter={() => handleSectionEnter(stripSection.id)}
      onMouseLeave={handleSectionLeave}
    >
      <span className="mr-2 shrink-0 text-xs uppercase tracking-wide text-text-muted">
        {stripSection.label}
      </span>
      {stripItems.map((item) => {
        const active = item.id === activeItemId;
        const ItemIcon = item.icon;
        return (
          <ShortcutHint
            key={item.id}
            destination={itemCarriesHint(stripSection, item) ? item.destination : undefined}
          >
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-control px-3 whitespace-nowrap transition-colors ${
                active
                  ? "bg-surface-raised font-medium text-text-primary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              } ${FOCUS_RING.join(" ")}`}
              onClick={(event) => goTo(item.destination, intentOfClick(event))}
            >
              {ItemIcon !== undefined && <ItemIcon className="size-3.5" />}
              {item.label}
            </button>
          </ShortcutHint>
        );
      })}
    </nav>
  );
};