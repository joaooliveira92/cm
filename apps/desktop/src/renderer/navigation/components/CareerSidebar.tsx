import { useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "../../components/ui/sidebar.js";
import { registerActionHandler } from "../../actions/dispatch.js";
import { NO_DRAG } from "../../chrome/header/drag-region.js";
import { NAV_GROUPS, NAV_SECTIONS } from "../nav-config.js";
import { CareerSidebarFooter, type SidebarManager } from "./CareerSidebarFooter.js";
import { SidebarNavSection } from "./SidebarNavSection.js";

/** Binds the `toggle-sidebar` Action to this sidebar for as long as it is mounted. Its own
 *  component because `useSidebar` only reads inside the provider, and the provider is the shell's. */
const SidebarToggleAction = () => {
  const { toggleSidebar } = useSidebar();
  useEffect(() => registerActionHandler("toggle-sidebar", toggleSidebar), [toggleSidebar]);
  return null;
};

/**
 * The career shell's primary navigation, as a left sidebar.
 *
 * It sits below the title band rather than beside it — the band is the window's
 * drag handle and carries the club identity, so it spans the full width and the
 * sidebar starts under it.
 *
 * No `top`/`height` override is needed for that, unlike the shadcn block this was
 * modelled on: that block offsets the sidebar by `--header-height` because
 * upstream positions it `fixed` against the viewport. This vendored copy
 * positions it `absolute` inside its own flex row, which already begins below the
 * header, so an offset would push it down a second time and hang it off the
 * bottom of the window by exactly the header's height.
 *
 * `collapsible="icon"` rather than `offcanvas`: a manager who collapses the
 * sidebar for a wide table still needs to get back out of that table, and the
 * icon rail keeps every section one click away. Collapsing hides the submenus
 * (they have nowhere to go in a 3rem rail), and the section rows fall back to
 * their tooltips.
 *
 * The sections render under `NAV_GROUPS` headings, which are display only: one
 * `Primary navigation` landmark still wraps them all, and the keyboard prefix
 * still counts through `NAV_SECTIONS`.
 */
export const CareerSidebar = ({
  badges,
  manager,
}: {
  readonly badges?:
    | Readonly<Record<string, { readonly count: number; readonly label: string }>>
    | undefined;
  readonly manager?: SidebarManager | null | undefined;
}) => (
  <Sidebar collapsible="icon" style={NO_DRAG}>
    <SidebarContent>
      <nav aria-label="Primary navigation">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.sectionIds.map((id) => {
                const section = NAV_SECTIONS.find((candidate) => candidate.id === id);
                return section === undefined ? null : (
                  <SidebarNavSection
                    key={section.id}
                    section={section}
                    badgeCount={badges?.[section.id]?.count}
                    badgeLabel={badges?.[section.id]?.label}
                  />
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </nav>
    </SidebarContent>
    <SidebarSeparator />
    <CareerSidebarFooter manager={manager ?? null} />
    <SidebarRail />
    <SidebarToggleAction />
  </Sidebar>
);
