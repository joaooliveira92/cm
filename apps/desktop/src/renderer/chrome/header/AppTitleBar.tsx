/**
 * The title band every shell caps with — the career navbar's first row, the
 * main menu, the save list, and the creation flow.
 *
 * It is the window's drag handle (`titleBarStyle: "hiddenInset"` leaves the
 * window with no other one on macOS), so the interactive clusters opt back out
 * with `NO_DRAG` or they stop taking clicks. On macOS it also reserves the
 * traffic-light inset: the band reaches the top edge, and the lights sit inside
 * it rather than on top of the leftmost control.
 */
import type { ReactNode } from "react";
import { HeaderTitle } from "./HeaderTitle.js";
import { DRAG, NO_DRAG } from "./drag-region.js";
import { trafficLightInset } from "./platform.js";

export interface AppTitleBarProps {
  readonly title: string;
  /** Left-zone controls, after the traffic-light inset. */
  readonly leading?: ReactNode;
  /** Right-zone controls. */
  readonly actions?: ReactNode;
  /** Rendered in place of the centred title — the career shell's club identity. */
  readonly identity?: ReactNode;
  /** False when the shell owns its own page heading. See `HeaderTitle`. */
  readonly titleAsHeading?: boolean;
}

export const AppTitleBar = ({
  title,
  leading,
  actions,
  identity,
  titleAsHeading = true,
}: AppTitleBarProps) => (
  <div
    className={`relative flex h-11 w-full shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-bg-raised pr-3 select-none ${trafficLightInset()}`}
    style={DRAG}
  >
    <div className="flex min-w-0 items-center gap-2" style={NO_DRAG}>
      {leading}
      {identity}
    </div>

    {identity === undefined && <HeaderTitle title={title} asHeading={titleAsHeading} />}

    <div className="flex shrink-0 items-center gap-2" style={NO_DRAG}>
      {actions}
    </div>
  </div>
);
