import { ChevronRight } from "lucide-react";
import { useSyncExternalStore } from "react";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "../../components/ui/collapsible.js";
import {
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
 * One primary section in the sidebar: its own row, and the submenu of items it
 * expands into.
 *
 * This is the pair the horizontal navbar split across two components —
 * `PrimaryNavItem` for the row and `ContextNav` for the strip below it. Vertical
 * nesting makes them one thing: a section and its items are adjacent in the
 * document, which is what lets the submenu keep its own `navigation` landmark
 * without the strip having to be re-derived from whichever section happens to be
 * previewed.
 *
 * Both levels of the keyboard prefix are advertised here. Level 0 badges the
 * section's own number key, and only while the section's go-to action is still
 * bound to it — a user override that moves the action elsewhere takes the key out
 * of level 0, so the badge goes with it. Level 1 badges the items of the section
 * the prefix has descended into.
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
  const expanded = state.isSectionExpanded(section.id);
  const Icon = section.icon;
  const hasChildren = section.items.length > 0;
  const count = badgeCount ?? 0;
  const hasBadge = count > 0;

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

  return (
    <Collapsible
      open={expanded}
      onOpenChange={() => actions.toggleSection(section.id)}
      render={<SidebarMenuItem />}
    >
      <ShortcutHint hintKey={sectionHintKey} className="relative flex w-full">
        <SidebarMenuButton
          data-nav-section={section.id}
          isActive={active}
          tooltip={section.label}
          aria-current={active ? "page" : undefined}
          onClick={(event) => actions.goTo(section.defaultDestination, intentOfClick(event))}
          className={cn(
            // The route's section keeps a mark on its leading edge, so it still reads as "here"
            // once the pointer's hover wash sits on another row, and in the icon rail.
            "relative before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full data-[active=true]:before:bg-primary",
            "[&>svg]:text-sidebar-foreground/70 data-[active=true]:[&>svg]:text-sidebar-accent-foreground",
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
      </ShortcutHint>

      {hasChildren && (
        <CollapsibleTrigger
          render={
            <SidebarMenuAction
              aria-label={`Toggle ${section.label} submenu`}
              aria-controls={`submenu-${section.id}`}
              className="text-sidebar-foreground/60 transition-transform duration-200 data-open:rotate-90"
            >
              <ChevronRight />
            </SidebarMenuAction>
          }
        />
      )}

      {hasChildren && (
        <CollapsiblePanel>
          {/* Its own landmark, nested in the sidebar's: the submenu is where a
              player actually aims, and naming it after the section is what makes
              "the Squad submenu" addressable to a screen reader and to a test. */}
          <nav id={`submenu-${section.id}`} aria-label={`${section.label} submenu`}>
            <SidebarMenuSub>
              {section.items.map((item, index) => {
                const ItemIcon = item.icon;
                const itemActive = item.id === state.activeItemId;
                return (
                  <SidebarMenuSubItem key={item.id}>
                    <ShortcutHint
                      hintKey={itemsAreDeep ? POSITION_KEYS[index] : undefined}
                      className="relative flex w-full"
                    >
                      <SidebarMenuSubButton
                        data-nav-item={item.id}
                        isActive={itemActive}
                        aria-current={itemActive ? "page" : undefined}
                        onClick={(event) => actions.goTo(item.destination, intentOfClick(event))}
                      >
                        {ItemIcon !== undefined && <ItemIcon />}
                        <span>{item.label}</span>
                      </SidebarMenuSubButton>
                    </ShortcutHint>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </nav>
        </CollapsiblePanel>
      )}
    </Collapsible>
  );
};
