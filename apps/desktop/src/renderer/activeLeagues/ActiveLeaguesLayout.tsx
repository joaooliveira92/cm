import type { ReactNode } from "react";
import { SCREEN_GRID_TEMPLATE } from "./density.js";

/**
 * The Active Leagues screen frame: the full viewport given to a flexible workspace beside a
 * narrow, persistent sidebar, with the commitment actions isolated at the bottom-right.
 *
 * The frame is a slot composition on purpose. The workspace is built here (ticket 05); the
 * consequence sidebar and the Cancel/Continue footer arrive as slots the next slice fills, so the
 * layout contract — what is clamped, what scrolls, what stays pinned — is settled and testable
 * before either of those components exists.
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
  <div className={`grid h-full min-h-0 w-full gap-4 p-4 ${SCREEN_GRID_TEMPLATE}`}>
    <div className="flex min-h-0 min-w-0 flex-col">{workspace}</div>
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col">{sidebar}</div>
      <div className="flex shrink-0 items-center justify-end gap-2">{footer}</div>
    </div>
  </div>
);
