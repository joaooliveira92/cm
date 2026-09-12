import { useSyncExternalStore } from "react";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import { FOCUS_RING } from "../../focus.js";
import { intentOfClick } from "../adapter.js";
import { useNavContext } from "../navContext.js";
import { POSITION_KEYS, NAV_SECTIONS } from "../nav-config.js";
import { getScopeState, subscribeScopeState } from "../../actions/scopeState.js";

const sectionKeyForId = (id: string): string | undefined => {
  const idx = NAV_SECTIONS.findIndex((s) => s.id === id);
  return idx >= 0 ? String(idx + 1) : undefined;
};

export const ContextNav = () => {
  const { state, actions, meta } = useNavContext();
  const { stripSection, activeItemId } = state;
  const { goTo, handleSectionEnter, handleSectionLeave } = actions;
  const { stripItems } = meta;

  const scope = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);
  const isDeep = scope.prefixActive === true && scope.prefixKind === "level1" && stripSection !== null
    ? scope.deepSectionId === sectionKeyForId(stripSection.id)
    : false;

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
      {stripItems.map((item, idx) => {
        const active = item.id === activeItemId;
        const ItemIcon = item.icon;
        const hintKey = isDeep ? POSITION_KEYS[idx] : undefined;
        return (
          <ShortcutHint
            key={item.id}
            hintKey={hintKey}
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