import { type JSX, useEffect, useMemo, useState } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { resolveNationColours } from "./nationArtwork.js";

export function NationEmblem({ countryId }: { countryId: PlayableSlotCountryId }): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const colours = useMemo(() => resolveNationColours(countryId), [countryId]);

  useEffect(() => setImageFailed(false), []);

  if (colours === null || imageFailed) {
    return (
      <div className="flex h-12 w-16 flex-none items-center justify-center rounded-md border border-dashed border-[#d4a359]/30 bg-[#05080e]/80 font-mono text-[0.6rem] font-bold uppercase tracking-[0.16em] text-[#64778d]">
        N/A
      </div>
    );
  }

  return (
    <div className="relative h-12 w-16 flex-none overflow-hidden rounded-md border border-[#d4a359]/45 bg-[#05080e] shadow-[0_0_18px_rgba(212,163,89,0.12)]">
      <img
        src={colours.url}
        alt={colours.label}
        width={64}
        height={48}
        draggable={false}
        onError={() => setImageFailed(true)}
        className="h-full w-full object-cover"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10"
      />
    </div>
  );
}
