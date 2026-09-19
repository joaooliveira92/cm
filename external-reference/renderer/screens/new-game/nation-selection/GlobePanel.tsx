import type { JSX } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";

import { DossierSlidePanel } from "./DossierSlidePanel/index.js";
import { GLOBE_TRANSITION_MS, useArmedAfterMount } from "./globeHandoffTransition.js";
import { InteractiveGlobe } from "./InteractiveGlobe.js";

interface GlobePanelProps {
  focusedSlotId: PlayableSlotCountryId;
  isDossierOpen: boolean;
  onNationClick: (countryId: string) => void;
  onChangeNation: () => void;
  onConfirm: (countryId: PlayableSlotCountryId) => void;
  onRecommendedSetup: (countryId: PlayableSlotCountryId) => void;
}

const TARGETING_BEZEL = (
  <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
    <div className="absolute left-6 top-6 h-8 w-8 border-l border-t border-[#2ab8e6]/25" />
    <div className="absolute right-6 top-6 h-8 w-8 border-r border-t border-[#2ab8e6]/25" />
    <div className="absolute bottom-6 left-6 h-8 w-8 border-b border-l border-[#2ab8e6]/25" />
    <div className="absolute bottom-6 right-6 h-8 w-8 border-b border-r border-[#2ab8e6]/25" />
  </div>
);

export function GlobePanel({
  focusedSlotId,
  isDossierOpen,
  onNationClick,
  onChangeNation,
  onConfirm,
  onRecommendedSetup,
}: GlobePanelProps): JSX.Element {
  // Fades in over the same window CampaignLaunchGate's departing decorative
  // globe fades out, so the handoff reads as one continuous transition.
  const globeVisible = useArmedAfterMount(true);

  return (
    <section
      aria-label="Nation details"
      className="
        relative z-10
        h-full min-h-0 min-w-0
        flex-1 overflow-hidden
        bg-[#020406]
      "
    >
      {/* Globe viewport */}
      <div className="absolute inset-0 min-h-0 min-w-0 overflow-hidden">
        {TARGETING_BEZEL}

        <div
          className={`absolute inset-0 transition-opacity ease-out ${globeVisible ? "opacity-100" : "opacity-0"}`}
          style={{ transitionDuration: `${GLOBE_TRANSITION_MS}ms` }}
        >
          <InteractiveGlobe focusedCountryId={focusedSlotId} onNationClick={onNationClick} />
        </div>
      </div>

      {/* Dossier remains pinned to this panel at every width */}
      <DossierSlidePanel
        countryId={focusedSlotId}
        isOpen={isDossierOpen}
        onChangeNation={onChangeNation}
        onConfirm={onConfirm}
        onRecommendedSetup={onRecommendedSetup}
      />
    </section>
  );
}
