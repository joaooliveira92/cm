import type { ReactNode } from "react";
import { SCREEN_GRID_TEMPLATE } from "./density.js";

/**
 * The Active Leagues screen frame: the full viewport given to a flexible workspace beside a
 * narrow, persistent sidebar, with the commitment actions isolated at the bottom-right.
 *
 * The frame is a slot composition on purpose, so the layout contract — what is clamped, what
 * scrolls, what stays pinned — is settled in one file and testable independently of what fills the
 * slots.
 *
 * Below 960px the sidebar column disappears: the screen becomes a single column and the sidebar
 * is rendered *inside* the workspace instead (see `useMediaQuery`), so the caller passes no
 * `sidebar` here. The footer slot is likewise empty inside the creation shell, where the shell's
 * own bottom bar carries Cancel and Continue.
 *
 * Both columns are `min-h-0` flex containers so that overflow lands on the league list inside the
 * workspace rather than on the page: the sidebar, the workspace actions, and the footer never
 * scroll out of view.
 */

export interface ActiveLeaguesLayoutProps {
  readonly workspace: ReactNode;
  /** The persistent consequence panel. */
  readonly sidebar?: ReactNode;
  /** Cancel and Continue, isolated at the bottom-right of the sidebar column. */
  readonly footer?: ReactNode;
}

export const ActiveLeaguesLayout = ({
  workspace,
  sidebar,
  footer,
}: ActiveLeaguesLayoutProps) => (
  <div className={`grid h-full min-h-0 w-full gap-4 p-2 xl:p-4 ${SCREEN_GRID_TEMPLATE}`}>
    <div className="flex min-h-0 min-w-0 flex-col">{workspace}</div>
    {(sidebar !== undefined || footer !== undefined) && (
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
        {footer !== undefined && (
          <div className="flex shrink-0 items-center justify-end gap-2">{footer}</div>
        )}
      </div>
    )}
  </div>
);
