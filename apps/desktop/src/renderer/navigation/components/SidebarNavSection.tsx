import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { useSyncExternalStore } from "react";
import { ShortcutHint } from "../../discoverability/ShortcutHint.js";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/ui/sidebar.js";
import { cn } from "../../lib/utils.js";
import { useNavContext } from "../navContext.js";
import type { NavSection } from "../nav-config.js";
import { NAV_SECTIONS } from "../nav-config.js";
import { sectionTriggerId, type SectionFlyoutHandle } from "./SectionFlyout.js";
import { getScopeState, subscribeScopeState } from "../../actions/scopeState.js";
import { ACTION_REGISTRY } from "../../actions/allActions.js";
import { getBindingOverrides, subscribeBindingOverrides } from "../../actions/bindingState.js";
import { effectiveBinding } from "../../actions/overrides.js";

/**
 * One primary section row in the sidebar. The row is a detached trigger of the
 * shared `SectionFlyout`: clicking it opens that panel on this section's items
 * and does not navigate; an item in the panel does. The trigger is click-only,
 * unlike shadcn's navigation menu, whose Base UI root opens on hover with no
 * switch to turn it off — and a sidebar invites the pointer to travel down it,
 * flashing a panel over the screen for every row it crosses. See the
 * `2026-09-27-section-items-open-in-a-flyout` Agent Note.
 *
 * The row is still where "here" is read: the route's section keeps its active
 * mark, and a caption under it names the current item when that differs from
 * the section's own label.
 *
 * Both levels of the keyboard prefix are advertised here. Level 0 badges the
 * section's own number key, and only while the section's go-to action is still
 * bound to it — a user override that moves the action elsewhere takes the key out
 * of level 0, so the badge goes with it. Level 1 is the flyout's business.
 */
export const SidebarNavSection = ({
  section,
  flyout,
  badgeCount,
  badgeLabel,
}: {
  readonly section: NavSection;
  readonly flyout: SectionFlyoutHandle;
  readonly badgeCount?: number | undefined;
  readonly badgeLabel?: string | undefined;
}) => {
  const { state } = useNavContext();
  const active = state.activeSectionId === section.id;
  const Icon = section.icon;
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

  const activeItem = active
    ? section.items.find((item) => item.id === state.activeItemId)
    : undefined;
  const caption =
    activeItem !== undefined && activeItem.label !== section.label ? activeItem.label : undefined;

  return (
    <SidebarMenuItem>
      <ShortcutHint hintKey={sectionHintKey} className="relative flex w-full">
        <PopoverPrimitive.Trigger
          handle={flyout}
          payload={section}
          id={sectionTriggerId(section.id)}
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

      {/* Where in the section the route is, now that the item list is behind a click. The rail
          has no width for it; the panel marks the current item there instead. */}
      {caption !== undefined && (
        <span className="block truncate pb-1 pl-8 text-data text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          {caption}
        </span>
      )}
    </SidebarMenuItem>
  );
};
