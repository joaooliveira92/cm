/**
 * The career band's identity zone: the club crest and name, or the thing the
 * current screen names instead.
 *
 * Lifted out of the old `Navbar` when the primary navigation moved to a sidebar.
 * The band survived that move unchanged — it was never part of the nav rows, only
 * the row above them — so it becomes its own part rather than being rewritten
 * into the shell.
 */
import type { ClubColoursView } from "@cm-clone/contracts";
import { ClubBadge } from "../../components/shared/ClubBadge.js";
import type { ScreenIdentity } from "../../screenIdentity.js";

export const CareerIdentity = ({
  clubName,
  clubColours,
  badgeKey,
  identity,
}: {
  readonly clubName: string | null;
  readonly clubColours: ClubColoursView | null;
  readonly badgeKey: string | null;
  /** Replaces the club name while a screen names something else. */
  readonly identity: ScreenIdentity | null;
}) => {
  if (identity === null) {
    return (
      <span className="flex min-w-0 items-center gap-2 truncate text-title">
        {clubName !== null && clubColours !== null && (
          <ClubBadge badgeKey={badgeKey} colours={clubColours} clubName={clubName} size={24} />
        )}
        <span className="truncate">{clubName ?? " "}</span>
      </span>
    );
  }
  if (identity.kind === "club") {
    // A foreign club's screen: the badge shield in that club's own colours — no badge key rides the
    // club reads, so `ClubBadge` paints the initials-holding shield — followed by its name and the
    // foreign marker, exactly the pair the page's own header draws.
    return (
      <span className="flex min-w-0 items-center gap-2 truncate text-title">
        <ClubBadge badgeKey={null} colours={identity.colours} clubName={identity.name} size={24} />
        <span className="truncate">
          {identity.name}{" "}
          <span className="font-semibold opacity-80">({identity.qualifier})</span>
        </span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col leading-tight">
      <span className="truncate">
        {identity.name} <span className="font-semibold opacity-80">({identity.qualifier})</span>
      </span>
      <span className="truncate text-data font-semibold opacity-80">{identity.facts}</span>
    </span>
  );
};
