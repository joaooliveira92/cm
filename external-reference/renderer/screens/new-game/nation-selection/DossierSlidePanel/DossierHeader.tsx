import { ShipWheel } from "lucide-react";
import type { JSX } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { NationEmblem } from "./NationEmblem.js";
import { getCountryCode } from "./nationArtwork.js";

interface DossierHeaderProps {
  countryId: PlayableSlotCountryId;
  nationName: string;
  appointmentTitle: string;
}

export function DossierHeader({
  countryId,
  nationName,
  appointmentTitle,
}: DossierHeaderProps): JSX.Element {
  return (
    <header className="flex flex-col gap-3 border-b border-[#d4a359]/20 bg-black/25 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <NationEmblem countryId={countryId} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShipWheel className="h-3.5 w-3.5 shrink-0 text-[#d4a359]" aria-hidden="true" />
            <p className="truncate font-mono text-[0.55rem] uppercase tracking-[0.2em] text-[#7d91a7] sm:text-[0.6rem] sm:tracking-[0.28em]">
              You have been appointed {appointmentTitle}
            </p>
          </div>
          <h3
            id={`nation-dossier-heading-${countryId}`}
            className="mt-1 truncate font-mono text-base font-black uppercase tracking-[0.1em] text-[#ece5d8] sm:text-xl sm:tracking-[0.12em]"
          >
            {nationName}
          </h3>
          <p className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[#d4a359]/80">
            Fleet record · {getCountryCode(countryId)}
          </p>
        </div>
      </div>
    </header>
  );
}
