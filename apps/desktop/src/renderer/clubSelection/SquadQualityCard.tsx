import type { SquadQualityBand } from "@cm-clone/shared";
import { DetailCard } from "./DetailCard.js";
import { SquadQualityMeter } from "./SquadQualityMeter.js";

export interface SquadQualityCardProps {
  readonly band: SquadQualityBand;
  /** The club's primary colour, which tints the band's word. */
  readonly accentColour: string;
}

/** The rail's segmented meter and band word, at panel scale. A band is a rank among six, not a
 *  measurement, so there is no percentage to state. */
export const SquadQualityCard = ({ band, accentColour }: SquadQualityCardProps) => (
  <DetailCard title="Squad Quality">
    <div className="flex items-center gap-3">
      <SquadQualityMeter band={band} />
      <span className="text-data font-semibold" style={{ color: accentColour }}>
        {band}
      </span>
    </div>
  </DetailCard>
);
