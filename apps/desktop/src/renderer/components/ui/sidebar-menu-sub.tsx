/**
 * The nested-menu half of the sidebar primitive set: the sub-list a section
 * expands into, and the trailing action slot its row carries.
 *
 * Split out of `sidebar.tsx` rather than appended to it because that file is
 * already at 547 lines and the repo caps a source file at 600. Re-exported from
 * `sidebar.tsx`, so consumers still import the whole set from one place.
 */
import * as React from "react";

import { cn } from "../../lib/utils.js";

interface SidebarMenuActionProps extends React.ComponentProps<"button"> {
  showOnHover?: boolean;
  ref?: React.Ref<HTMLButtonElement> | undefined;
}

const SidebarMenuAction = ({
  className,
  showOnHover = false,
  ref,
  ...props
}: SidebarMenuActionProps) => (
  <button
    ref={ref}
    data-sidebar="menu-action"
    className={cn(
      "absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
      // Increase the hit area of the button on mobile.
      "after:absolute after:-inset-2 md:after:hidden",
      "group-data-[collapsible=icon]:hidden",
      showOnHover &&
        "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-open:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
      className,
    )}
    {...props}
  />
);
SidebarMenuAction.displayName = "SidebarMenuAction";

interface SidebarMenuSubProps extends React.ComponentProps<"ul"> {
  ref?: React.Ref<HTMLUListElement> | undefined;
}

const SidebarMenuSub = ({ className, ref, ...props }: SidebarMenuSubProps) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      "group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
);
SidebarMenuSub.displayName = "SidebarMenuSub";

interface SidebarMenuSubItemProps extends React.ComponentProps<"li"> {
  ref?: React.Ref<HTMLLIElement> | undefined;
}

const SidebarMenuSubItem = ({ ref, ...props }: SidebarMenuSubItemProps) => (
  <li ref={ref} {...props} />
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

interface SidebarMenuSubButtonProps extends React.ComponentProps<"button"> {
  size?: "sm" | "md";
  isActive?: boolean;
  ref?: React.Ref<HTMLButtonElement> | undefined;
}

const SidebarMenuSubButton = ({
  size = "md",
  isActive = false,
  className,
  ref,
  ...props
}: SidebarMenuSubButtonProps) => (
  <button
    ref={ref}
    data-sidebar="menu-sub-button"
    data-size={size}
    data-active={isActive}
    className={cn(
      "flex h-7 w-full min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-left text-sidebar-foreground outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
      "data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
      "[&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
      size === "sm" && "text-xs",
      size === "md" && "text-sm",
      "group-data-[collapsible=icon]:hidden",
      className,
    )}
    {...props}
  />
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export { SidebarMenuAction, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem };
