import { Keyboard, PanelLeftClose } from "lucide-react";
import type { ReactNode } from "react";
import { dispatchAction } from "../../actions/dispatch.js";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../../components/ui/sidebar.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip.js";
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

/** A square icon control for the footer row. Hidden in the icon rail, which has room for one
 *  column only; there the header trigger, the rail and the Actions' keys still reach both. */
const FooterIconButton = ({
  label,
  onClick,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:hidden [&>svg]:size-4"
        >
          {children}
        </button>
      }
    />
    <TooltipContent side="top">{label}</TooltipContent>
  </Tooltip>
);

/**
 * The sidebar's foot: one row, the manager beside the two shell controls a manager reaches for
 * without a destination in mind.
 *
 * One row rather than a row each, because the sidebar shares an 800px window with eight section
 * rows and their group headings, and every footer row is a section row pushed out of view.
 *
 * The controls dispatch the `open-help` and `toggle-sidebar` Actions rather than calling the overlay
 * or the provider directly, so a pointer and the keyboard binding go through the one handler. The
 * manager row is the shadcn block's user row, pointed at the Manager Profile — the club identity
 * already lives in the title band, so the sidebar carries the person rather than the team.
 */
export const CareerSidebarFooter = ({ manager }: { readonly manager: SidebarManager | null }) => {
  const { actions } = useNavContext();

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem className="flex items-center gap-1">
          {manager === null ? (
            <span className="flex-1" />
          ) : (
            <SidebarMenuButton
              size="lg"
              tooltip={`${manager.firstName} ${manager.lastName}`}
              className="min-w-0 flex-1"
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
          )}
          <FooterIconButton label="Keyboard shortcuts" onClick={() => dispatchAction("open-help")}>
            <Keyboard />
          </FooterIconButton>
          <FooterIconButton label="Collapse sidebar" onClick={() => dispatchAction("toggle-sidebar")}>
            <PanelLeftClose />
          </FooterIconButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
};
