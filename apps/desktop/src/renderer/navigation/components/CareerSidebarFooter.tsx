import { Keyboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { dispatchAction } from "../../actions/dispatch.js";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../../components/ui/sidebar.js";
import { intentOfClick } from "../adapter.js";
import { useNavContext } from "../navContext.js";

/** What the footer shows of the manager: the Manager Profile's name, avatar colours and tenure. */
export interface SidebarManager {
  readonly firstName: string;
  readonly lastName: string;
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly tenureSeasons: number;
}

const initialsOf = (manager: SidebarManager): string =>
  `${manager.firstName.charAt(0)}${manager.lastName.charAt(0)}`.toUpperCase();

const tenureOf = (seasons: number): string =>
  seasons <= 1 ? "First season" : `Season ${seasons} in charge`;

/**
 * The sidebar's foot: the two shell controls a manager reaches for without a destination in mind,
 * and the manager themself.
 *
 * The rows dispatch the `open-help` and `toggle-sidebar` Actions rather than calling the overlay or
 * the provider directly, so a pointer and the keyboard binding go through the one handler. The
 * manager row is the shadcn block's user row, pointed at the Manager Profile — the club identity
 * already lives in the title band, so the sidebar carries the person rather than the team.
 */
export const CareerSidebarFooter = ({ manager }: { readonly manager: SidebarManager | null }) => {
  const { state } = useSidebar();
  const { actions } = useNavContext();
  const collapsed = state === "collapsed";

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="sm"
            tooltip="Keyboard shortcuts"
            className="text-sidebar-foreground/70"
            onClick={() => dispatchAction("open-help")}
          >
            <Keyboard />
            <span>Keyboard shortcuts</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="sm"
            tooltip="Expand sidebar"
            className="text-sidebar-foreground/70"
            onClick={() => dispatchAction("toggle-sidebar")}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            <span>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {manager !== null && (
          <SidebarMenuItem className="mt-1">
            <SidebarMenuButton
              size="lg"
              tooltip={`${manager.firstName} ${manager.lastName}`}
              onClick={(event) => actions.goTo("manager", intentOfClick(event))}
            >
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                style={{ backgroundColor: manager.primaryColor, color: manager.secondaryColor }}
              >
                {initialsOf(manager)}
              </span>
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate font-medium">
                  {manager.firstName} {manager.lastName}
                </span>
                <span className="truncate text-xs text-text-secondary">
                  {tenureOf(manager.tenureSeasons)}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </SidebarFooter>
  );
};
