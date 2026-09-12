import type { JSX } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { NATION_DOSSIER_FIELDS } from "@/content/nationDossierFields.js";
import { NATION_FLAVOR_TEXT } from "@/content/nationFlavorText.js";
import { cn } from "@/lib/utils.js";
import { DossierAccordion } from "./DossierAccordion/index.js";
import { DossierControls } from "./DossierControls.js";
import { DossierCover } from "./DossierCover.js";
import { DossierHeader } from "./DossierHeader.js";
import { buildDossierTabs } from "./DossierTabContent.js";
import { useSlideVisibility } from "./useSlideVisibility.js";

export interface DossierSlidePanelProps {
  countryId: PlayableSlotCountryId;
  isOpen: boolean;
  onChangeNation: () => void;
  onConfirm: (countryId: PlayableSlotCountryId) => void;
  onRecommendedSetup: (countryId: PlayableSlotCountryId) => void;
}

export function DossierSlidePanel({
  countryId,
  isOpen,
  onChangeNation,
  onConfirm,
  onRecommendedSetup,
}: DossierSlidePanelProps): JSX.Element | null {
  const flavor = NATION_FLAVOR_TEXT[countryId];
  const fields = NATION_DOSSIER_FIELDS[countryId];
  const { mounted, entered } = useSlideVisibility(isOpen);

  if (!mounted) return null;

  const tabs = buildDossierTabs(countryId, flavor);

  return (
    <section
      aria-labelledby={`nation-dossier-heading-${countryId}`}
      aria-hidden={!isOpen}
      className={cn(
        "absolute inset-x-0 bottom-0 z-30 max-h-[88dvh] origin-bottom ease-in overflow-y-auto overscroll-contain transition-[transform,opacity] duration-500 ease-&lsqb;cubic-bezier(0.22,1,0.36,1)&rsqb; motion-reduce:transition-none sm:max-h-[78dvh]",
        entered ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="relative isolate min-w-0 overflow-hidden border-t border-[#d4a359]/40 bg-[#070b12] shadow-[0_-24px_70px_rgba(0,0,0,0.72),0_0_0_1px_rgba(212,163,89,0.08)]">
        <DossierCover countryId={countryId} />
        <DossierHeader
          countryId={countryId}
          nationName={flavor.name}
          appointmentTitle={fields.appointmentTitle}
        />
        <DossierAccordion
          economy={tabs.economy}
          military={tabs.military}
          diplomacy={tabs.diplomacy}
        />
        <DossierControls
          countryId={countryId}
          nationName={flavor.name}
          onChangeNation={onChangeNation}
          onConfirm={onConfirm}
          onRecommendedSetup={onRecommendedSetup}
        />
      </div>
    </section>
  );
}
