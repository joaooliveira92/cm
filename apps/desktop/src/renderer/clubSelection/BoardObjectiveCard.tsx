import type { ClubSelectionRow } from "@cm-clone/contracts";
import { Badge } from "../components/ui/badge.js";
import { DetailCard } from "./DetailCard.js";
import { qualityPresentationOf } from "./club-profile.js";
import { expectationProse } from "./model.js";

export interface BoardObjectiveCardProps {
  readonly club: Pick<ClubSelectionRow, "boardObjectiveMin" | "boardObjectiveMax" | "statureTier" | "squadQualityBand">;
  readonly leagueSize: number;
}

export const BoardObjectiveCard = ({ club, leagueSize }: BoardObjectiveCardProps) => {
  const quality = qualityPresentationOf(club.squadQualityBand);

  return (
    <DetailCard title="Board Objective">
      <p className="text-body font-medium text-text-primary">{expectationProse(club, leagueSize)}</p>
      <div className="mt-2 flex gap-2">
        <Badge variant="outline">{club.statureTier}</Badge>
        <Badge variant={quality.variant}>{quality.label}</Badge>
      </div>
    </DetailCard>
  );
};
