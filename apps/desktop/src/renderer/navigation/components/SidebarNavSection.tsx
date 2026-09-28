import { useRef, useSyncExternalStore } from "react";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/ui/sidebar.js";
import { cn } from "../../lib/utils.js";
import { intentOfClick } from "../adapter.js";
import { useNavContext } from "../navContext.js";
import type { NavSection } from "../nav-config.js";
import { NAV_SECTIONS, POSITION_KEYS } from "../nav-config.js";
import { getScopeState, subscribeScopeState } from "../../actions/scopeState.js";
import { ACTION_REGISTRY } from "../../actions/allActions.js";
import { getBindingOverrides, subscribeBindingOverrides } from "../../actions/bindingState.js";
import { effectiveBinding } from "../../actions/overrides.js";

/**
 * One primary section in the sidebar: its row, and the panel of items the row
 * opens beside the sidebar.
 *
 * Clicking the row opens the panel and does not navigate; an item in the panel
 * does. The panel is a click-only popover rather than shadcn's navigation menu,
 * whose Base UI root opens on hover with no switch to turn it off — and a
 * sidebar invites the pointer to travel down it, flashing a panel over the
 * screen for every row it crosses. See the
 * `2026-09-27-section-items-open-in-a-flyout` Agent Note.
 *
 * The row is still where "here" is read: the route's section keeps its active
 * mark, and a caption under it names the current item when that differs from
 * the section's own label.
 *
 * Both levels of the keyboard prefix are advertised here. Level 0 badges the
 * section's own number key, and only while the section's go-to action is still
 * bound to it — a user override that moves the action elsewhere takes the key out
 * of level 0, so the badge goes with it. Level 1 opens the panel of the section
 * the prefix has descended into and badges its items, without taking focus.
 */
export const SidebarNavSection = ({
  section,
  badgeCount,
  badgeLabel,
}: {
  readonly section: NavSection;
  readonly badgeCount?: number | undefined;
  readonly badgeLabel?: string | undefined;
}) => {
  const { state, actions } = useNavContext();
  const active = state.activeSectionId === section.id;
  const Icon = section.icon;
  const count = badgeCount ?? 0;
  const hasBadge = count > 0;
  // An item click navigates, and navigation moves focus to the new screen; handing it back to the
  // row as the panel closes would undo that.
  const returnFocus = useRef(true);

  const scope = useSyncExternalStore(subscribeScopeState, getScopeState, getScopeState);
  const overrides = useSyncExternalStore(
    subscribeBindingOverrides,
    getBindingOverrides,
    getBindingOverrides,
  );

  const positionKey = String(NAV_SECTIONS.indexOf(section) + 1);
  const goToAction = ACTION_REGISTRY.get(`go-to-${section.id}`);
  const keyDispatches =
    goToAction !== undefined && effectiveBinding(goToAction, overrides) === `g ${positionKey}`;
  const sectionHintKey =
    scope.prefixActive === true && scope.prefixKind === "level0" && keyDispatches
      ? positionKey
      : undefined;

  const itemsAreDeep =
    scope.prefixActive === true &&
    scope.prefixKind === "level1" &&
    scope.deepSectionId === positionKey;
  const openedByUser = state.openSectionId === section.id;
  const open = openedByUser || itemsAreDeep;

  const activeItem = active
    ? section.items.find((item) => item.id === state.activeItemId)
    : undefined;
  const caption =
    activeItem !== undefined && activeItem.label !== section.label ? activeItem.label : undefined;

  return (
    <SidebarMenuItem>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            returnFocus.current = true;
            actions.setOpenSection(section.id);
          } else if (openedByUser) {
            actions.closeSection();
          }
        }}
      >
        <ShortcutHint hintKey={sectionHintKey} className="relative flex w-full">
          <PopoverTrigger
            render={
              <SidebarMenuButton
                data-nav-section={section.id}
                isActive={active}
                tooltip={section.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // The route's section keeps a mark on its leading edge, so it still reads as
                  // "here" once the pointer's hover wash sits on another row, and in the icon rail.
                  "relative before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full data-[active=true]:before:bg-primary",
                  "[&>svg]:text-sidebar-foreground/70 data-[active=true]:[&>svg]:text-sidebar-accent-foreground",
                  "data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground",
                  hasBadge && "pr-14",
                )}
              >
                {Icon !== undefined && <Icon />}
                <span className="truncate">{section.label}</span>
                {hasBadge && (
                  <>
                    <SidebarMenuBadge
                      aria-label={`${count} ${badgeLabel ?? "unread"}`}
                      className="bg-destructive text-white"
                    >
                      {count > 99 ? "99+" : count}
                    </SidebarMenuBadge>
                    {/* The rail has no room for a count; a dot on the icon says there is one. */}
                    <span
                      aria-hidden="true"
                      className="absolute top-1 right-1 hidden size-1.5 rounded-full bg-destructive ring-2 ring-sidebar group-data-[collapsible=icon]:block"
                    />
                  </>
                )}
              </SidebarMenuButton>
            }
          />
        </ShortcutHint>

        <PopoverContent
          side="right"
          align="start"
          // Clears the sidebar's own padding and border, so the panel reads as beside it rather than on it.
          sideOffset={16}
          // Opened by the keyboard prefix, the panel only shows the item keys: focus stays where
          // the prefix was typed, so the next key still reaches the prefix handler.
          initialFocus={openedByUser}
          finalFocus={() => openedByUser && returnFocus.current}
          className="w-56 p-1"
        >
          {/* Its own landmark: naming it after the section is what makes "the Squad submenu"
              addressable to a screen reader and to a test, now that it is portalled out of the
              sidebar's. */}
          <nav aria-label={`${section.label} submenu`}>
            <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item, index) => {
                const ItemIcon = item.icon;
                const itemActive = item.id === state.activeItemId;
                return (
                  <li key={item.id}>
                    <ShortcutHint
                      hintKey={itemsAreDeep ? POSITION_KEYS[index] : undefined}
                      className="relative flex w-full"
                    >
                      <button
                        type="button"
                        data-nav-item={item.id}
                        data-active={itemActive}
                        aria-current={itemActive ? "page" : undefined}
                        onClick={(event) => {
                          returnFocus.current = false;
                          actions.goTo(item.destination, intentOfClick(event));
                        }}
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
        </PopoverContent>
      </Popover>

      {/* Where in the section the route is, now that the item list is behind a click. The rail
          has no width for it; the panel marks the current item there instead. */}
      {caption !== undefined && (
        <span className="block truncate pb-1 pl-8 text-xs text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {caption}
        </span>
      )}
    </SidebarMenuItem>
  );
};
