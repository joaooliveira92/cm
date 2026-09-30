import type { ClubColoursView } from "@cm-clone/contracts";
import { readableHeaderForeground } from "../../chrome/header/club-scheme.js";

export interface ClubColouredNameProps {
  readonly name: string;
  readonly colours: ClubColoursView;
}

/** A club's name painted in its own kit: `primary.background`, with the most readable foreground
 *  the club's own palette can supply on it. The club-scoped screens read a foreign club by its
 *  colours as well as by the `[Not your club]` marker. */
export const ClubColouredName = ({ name, colours }: ClubColouredNameProps) => (
  <span
    className="inline-block rounded-sm px-1.5 py-0.5"
    style={{ backgroundColor: colours.primary.background, color: readableHeaderForeground(colours) }}
  >
    {name}
  </span>
);