import type { ClubSelectionRow } from "@cm-clone/contracts";
import { Badge } from "../components/ui/badge.js";
import { ClubBadge } from "../components/shared/ClubBadge.js";
import { statureLabel } from "./club-profile.js";

export interface ClubHeroProps {
  readonly club: Pick<ClubSelectionRow, "badgeKey" | "clubColours" | "clubName" | "statureTier" | "squadQualityBand">;
}

/** The club-coloured band at the top of the profile: crest, name, stature and quality band. */
export const ClubHero = ({ club }: ClubHeroProps) => {
  const pColour = club.clubColours.primary.background;
  const fColour = club.clubColours.primary.foreground;

  return (
    <div
      className="relative -mx-3 mb-4 px-3 py-3"
      style={{ backgroundColor: pColour, color: fColour }}
    >
      <div className="flex items-center gap-3">
        <ClubBadge badgeKey={club.badgeKey} colours={club.clubColours} clubName={club.clubName} size={40} />
        <div className="flex-1 min-w-0">
          <h2
            className="text-heading truncate leading-tight"
            style={{ color: fColour }}
          >
            {club.clubName}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              {statureLabel(club.statureTier)}
            </Badge>
            <Badge>{club.squadQualityBand}</Badge>
          </div>
        </div>
      </div>
      {/* Subtle gradient overlay at the bottom of the band */}
      <div
        className="absolute bottom-0 left-0 right-0 h-4"
        style={{
          background: `linear-gradient(to top, ${pColour}, transparent)`,
        }}
      />
    </div>
  );
};
