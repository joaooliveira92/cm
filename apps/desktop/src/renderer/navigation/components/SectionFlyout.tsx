import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useRef, useSyncExternalStore, type MouseEvent } from "react";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import { cn } from "../../lib/utils.js";
import { getScopeState, subscribeScopeState } from "../../actions/scopeState.js";
import { intentOfClick } from "../adapter.js";
import { useNavContext } from "../navContext.js";
import type { NavSection, NavSectionId } from "../nav-config.js";
import { NAV_SECTIONS, POSITION_KEYS } from "../nav-config.js";

/** The handle that ties the sidebar's section rows to the one flyout they share. */
export type SectionFlyoutHandle = PopoverPrimitive.Handle<NavSection>;

export const createSectionFlyoutHandle = (): SectionFlyoutHandle =>
  PopoverPrimitive.createHandle<NavSection>();

/** The DOM id of a section row, which is how the flyout names the row it is anchored to. */
export const sectionTriggerId = (sectionId: NavSectionId): string => `nav-section-${sectionId}`;

/**
 * The item panel every section row opens: one popover with the rows as detached triggers, rather
 * than a popover per row.
 *
 * One popup is what makes the motion shadcn's navigation menu has possible. Moving from one section
 * to another is a trigger change on the same popup, so the positioner glides to the new row, the
 * popup resizes to the new list, and the viewport slides the old list out and the new one in along
 * the direction of travel. Separate popovers could only close one panel and open another. The
 * transitions themselves are in `index.css`, keyed on `data-section-flyout`.
 *
 * Clicking the open section's row again, clicking outside, or Escape closes it; navigating through
 * an item closes it too. The level-1 keyboard prefix opens its section's panel without taking
 * focus, so the next key still reaches the prefix handler.
 */
export const SectionFlyout = ({ handle }: { readonly handle: SectionFlyoutHandle }) => {
  const { state, actions } = useNavContext();
  const scope = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);
  // An item click navigates, and navigation moves focus to the new screen; handing it back to the
  // row as the panel closes would undo that.
  const returnFocus = useRef(true);

  const deepSection =
    scope.prefixActive === true && scope.prefixKind === "level1"
      ? NAV_SECTIONS[Number(scope.deepSectionId) - 1]
      : undefined;
  const shownSectionId = deepSection?.id ?? state.openSectionId;
  const openedByUser = deepSection === undefined && state.openSectionId !== null;

  return (
    <PopoverPrimitive.Root
      handle={handle}
      open={shownSectionId !== null}
      triggerId={shownSectionId === null ? null : sectionTriggerId(shownSectionId)}
      onOpenChange={(next, details) => {
        if (next) {
          const sectionId = details.trigger?.getAttribute("data-nav-section");
          if (sectionId !== null && sectionId !== undefined) {
            returnFocus.current = true;
            actions.setOpenSection(sectionId);
          }
        } else if (openedByUser) {
          actions.closeSection();
        }
      }}
    >
      {({ payload: section }) => (
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            data-section-flyout="positioner"
            className="z-50"
            side="right"
            align="start"
            // Clears the sidebar's own padding and border, so the panel reads as beside it rather
            // than on it.
            sideOffset={16}
          >
            <PopoverPrimitive.Popup
              data-section-flyout="popup"
              // Opened by the keyboard prefix, the panel only shows the item keys: focus stays
              // where the prefix was typed.
              initialFocus={openedByUser}
              finalFocus={() => openedByUser && returnFocus.current}
              className="rounded-md border bg-popover text-popover-foreground shadow-md outline-none"
            >
              <PopoverPrimitive.Viewport data-section-flyout="viewport">
                {section !== undefined && (
                  <SectionItems
                    section={section}
                    activeItemId={state.activeItemId}
                    hinted={deepSection?.id === section.id}
                    onPick={(item, event) => {
                      returnFocus.current = false;
                      actions.goTo(item.destination, intentOfClick(event));
                    }}
                  />
                )}
              </PopoverPrimitive.Viewport>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      )}
    </PopoverPrimitive.Root>
  );
};

/** One section's item list. Its own landmark, named after the section, so "the Squad submenu" is
 *  addressable to a screen reader and to a test even though it is portalled out of the sidebar's. */
const SectionItems = ({
  section,
  activeItemId,
  hinted,
  onPick,
}: {
  readonly section: NavSection;
  readonly activeItemId: string | null;
  readonly hinted: boolean;
  readonly onPick: (item: NavSection["items"][number], event: MouseEvent) => void;
}) => (
  <nav aria-label={`${section.label} submenu`} className="w-56 p-1">
    <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">{section.label}</p>
    <ul className="flex flex-col gap-0.5">
      {section.items.map((item, index) => {
        const ItemIcon = item.icon;
        const itemActive = item.id === activeItemId;
        return (
          <li key={item.id}>
            <ShortcutHint
              hintKey={hinted ? POSITION_KEYS[index] : undefined}
              className="relative flex w-full"
            >
              <button
                type="button"
                data-nav-item={item.id}
                data-active={itemActive}
                aria-current={itemActive ? "page" : undefined}
                onClick={(event) => onPick(item, event)}
                className={cn(
                  "flex h-8 w-full min-w-0 items-center gap-2 rounded-sm px-2 text-left text-sm outline-none transition-colors",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
                  "data-[active=true]:bg-accent data-[active=true]:font-medium data-[active=true]:text-accent-foreground",
                  "[&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-accent-foreground",
                )}
              >
                {ItemIcon !== undefined && <ItemIcon />}
                <span className="truncate">{item.label}</span>
              </button>
            </ShortcutHint>
          </li>
        );
      })}
    </ul>
  </nav>
);
