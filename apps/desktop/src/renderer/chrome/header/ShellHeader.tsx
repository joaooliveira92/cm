/**
 * The two-row header the pre-career shells (main menu, save list, creation
 * flow) cap with: the drag band over the adaptive row. The career shell builds
 * the same two rows out of the same parts, with its section nav between them.
 *
 * The point of routing all four shells through one band is that the window
 * chrome — the drag handle, the macOS traffic-light inset — is stated once. A
 * shell that drew its own header would lose both the moment `titleBarStyle`
 * changed.
 */
import type { ReactNode } from "react";
import { AppTitleBar } from "./AppTitleBar.js";
import { HeaderSecondaryRow } from "./HeaderSecondaryRow.js";
import { NO_DRAG } from "./drag-region.js";
import type { HeaderState } from "./career-header-state.js";

export interface ShellHeaderProps {
  readonly title: string;
  readonly state: HeaderState;
  readonly leading?: ReactNode;
  readonly actions?: ReactNode;
}

export const ShellHeader = ({ title, state, leading, actions }: ShellHeaderProps) => (
  <header className="shrink-0 text-text-primary">
    <AppTitleBar title={title} leading={leading} actions={actions} />
    <div
      className="flex h-7 w-full items-center border-b border-border-subtle bg-bg-raised px-3"
      style={NO_DRAG}
    >
      <HeaderSecondaryRow state={state} />
    </div>
  </header>
);
