import type { SquadQualityBand } from "@cm-clone/shared";
import { Progress } from "../components/ui/progress.js";
import { DetailCard } from "./DetailCard.js";
import { qualityPresentationOf } from "./club-profile.js";

export interface SquadQualityCardProps {
  readonly band: SquadQualityBand;
  /** The club's primary colour, which tints the percentage. */
  readonly accentColour: string;
}

export const SquadQualityCard = ({ band, accentColour }: SquadQualityCardProps) => {
  const qualityPct = qualityPresentationOf(band).percent;

  return (
    <DetailCard title="Squad Quality">
      <div className="flex items-center gap-3">
        <Progress value={qualityPct} className="h-2 flex-1" />
        <span className="text-data font-semibold tabular-nums" style={{ color: accentColour }}>
          {Math.round(qualityPct)}%
        </span>
      </div>
    </DetailCard>
  );
};
