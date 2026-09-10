import type { ClubColoursView, SaveId } from "@cm-clone/contracts";
import { type ReactNode } from "react";
import { NAV_SECTIONS } from "../../navigation/nav-config.js";
import { AppTitleBar } from "../../chrome/header/AppTitleBar.js";
import { clubHeaderStyle } from "../../chrome/header/club-scheme.js";
import { NO_DRAG } from "../../chrome/header/drag-region.js";
import { NavProvider } from "../../navigation/NavProvider.js";
import { ContextNav } from "./ContextNav.js";
import { PrimaryNavItem } from "./PrimaryNavItem.js";

export const Navbar = ({
  saveId,
  clubName,
  clubColours = null,
  badges,
  leading,
  secondary,
  actions,
}: {
  readonly saveId: SaveId;
  readonly clubName: string | null;
  readonly clubColours?: ClubColoursView | null;
  readonly badges?: Readonly<Record<string, { readonly count: number; readonly label: string }>>;
  readonly leading?: ReactNode;
  readonly secondary?: ReactNode;
  readonly actions?: ReactNode;
}) => {
  return (
    <NavProvider saveId={saveId}>
      <header className="club-header text-header-fg" style={clubHeaderStyle(clubColours)}>
        <AppTitleBar
          title={clubName ?? ""}
          leading={leading}
          identity={
            <span className="truncate text-lg font-bold">{clubName ?? "\u00a0"}</span>
          }
          actions={actions}
        />

        {secondary !== undefined && (
          <div
            className="flex h-7 w-full items-center border-b border-header-border bg-header-bg px-3"
            style={NO_DRAG}
          >
            {secondary}
          </div>
        )}

        <nav
          className="flex items-center gap-1 overflow-x-auto border-b border-border-subtle bg-bg-raised px-2 py-1 text-text-primary"
          aria-label="Primary navigation"
        >
          {NAV_SECTIONS.map((section) => (
            <PrimaryNavItem
              key={section.id}
              section={section}
              badgeCount={badges?.[section.id]?.count}
              badgeLabel={badges?.[section.id]?.label}
              children={section.items}
            />
          ))}
        </nav>

        <ContextNav />
      </header>
    </NavProvider>
  );
};