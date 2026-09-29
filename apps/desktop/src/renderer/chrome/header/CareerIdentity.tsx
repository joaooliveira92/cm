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
}) => (
  <span className="flex min-w-0 items-center gap-2 truncate text-title">
    {clubName !== null && clubColours !== null && (
      <ClubBadge badgeKey={badgeKey} colours={clubColours} clubName={clubName} size={24} />
    )}
    {identity === null ? (
      <span className="truncate">{clubName ?? " "}</span>
    ) : (
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate">
          {identity.name} <span className="font-semibold opacity-80">({identity.qualifier})</span>
        </span>
        <span className="truncate text-data font-semibold opacity-80">{identity.facts}</span>
      </span>
    )}
  </span>
);
