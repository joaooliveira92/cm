import type { SquadQualityBand } from "@cm-clone/shared";
import { QUALITY_SEGMENTS, filledSegments } from "./model.js";

export interface SquadQualityMeterProps {
  readonly band: SquadQualityBand;
}

/** The segmented quality meter, shared by the rail rows and the panel. Decorative: the band's word beside it carries the same fact
 *  in the accessible name. */
export const SquadQualityMeter = ({ band }: SquadQualityMeterProps) => (
  <span aria-hidden="true" className="flex gap-0.5">
    {Array.from({ length: QUALITY_SEGMENTS }, (_, index) => (
      <span
        key={index}
        className={`h-3 w-1.5 rounded-xs ${
          index < filledSegments(band)
            ? "bg-text-highlight"
            : "bg-surface-raised"
        }`}
      />
    ))}
  </span>
);
