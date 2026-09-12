import { Anchor } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "../components/ui/sidebar.js";

import { CAMPAIGN_SCREENS, SETTINGS_SCREENS, type Screen } from "./campaign-screen-registry.js";
export type { Screen } from "./campaign-screen-registry.js";
export interface AppSidebarProps {
  readonly screen: Screen;
  readonly onSelect: (screen: Screen) => void;
  readonly footer?: string;
}

export function AppSidebar({ screen, onSelect, footer }: AppSidebarProps) {
  if (
    screen === "file" ||
    screen === "new-game-nation" ||
    screen === "new-game-preferences" ||
    screen === "new-game-archetype" ||
    screen === "new-game-identity" ||
    screen === "new-game-fleet-method" ||
    screen === "new-game-review" ||
    screen === "opening-briefing"
  ) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1">
            <Anchor className="size-4 shrink-0" />
            <span className="truncate text-xs font-medium tracking-wider uppercase">Bluewave</span>
          </div>
        </SidebarHeader>
        <SidebarContent />
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Anchor className="size-4 shrink-0" />
          <span className="truncate text-xs font-medium tracking-wider uppercase">Bluewave</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Campaign</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {CAMPAIGN_SCREENS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={screen === item.id}
                    tooltip={item.label}
                    onClick={() => onSelect(item.id)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {SETTINGS_SCREENS.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={screen === item.id}
                    tooltip={item.label}
                    onClick={() => onSelect(item.id)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {footer !== undefined && (
        <SidebarFooter>
          <span className="truncate px-2 py-1 font-mono text-[12px] text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
            {footer}
          </span>
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}
