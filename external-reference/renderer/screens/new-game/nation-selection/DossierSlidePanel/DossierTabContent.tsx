import type { JSX, ReactNode } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { NATION_DOSSIER_FIELDS } from "@/content/nationDossierFields.js";
import type { NationFlavorText } from "@/content/nationFlavorText.js";

interface DossierFieldRowProps {
  label: string;
  value: string;
}

function DossierFieldRow({ label, value }: DossierFieldRowProps): JSX.Element {
  return (
    <p className="mt-2 font-mono text-[0.72rem] leading-relaxed">
      <span className="font-black uppercase tracking-[0.08em] text-[#d4a359]">{label}:</span>{" "}
      <span className="text-[#b4c1ce]">{value}</span>
    </p>
  );
}

export interface DossierTabs {
  readonly economy: ReactNode;
  readonly military: ReactNode;
  readonly diplomacy: ReactNode;
}

/**
 * Composes the existing per-nation flavor paragraph (`nationFlavorText.ts`)
 * with INC-2's new hand-authored dossier fields (`nationDossierFields.ts`)
 * into the existing three-tab accordion (spec §1) — no 4th tab.
 */
export function buildDossierTabs(
  countryId: PlayableSlotCountryId,
  flavor: NationFlavorText,
): DossierTabs {
  const fields = NATION_DOSSIER_FIELDS[countryId];

  return {
    economy: (
      <div>
        <p className="font-mono text-[.85rem]">{flavor.economy}</p>
        <DossierFieldRow label="Budget category" value={fields.budgetCategory} />
        <DossierFieldRow label="Shipbuilding capacity" value={fields.shipbuildingCapacity} />
        <DossierFieldRow label="Research strengths" value={fields.researchStrengths} />
        <DossierFieldRow label="Research weaknesses" value={fields.researchWeaknesses} />
      </div>
    ),
    military: (
      <div>
        <p className="font-mono text-[.85rem]">{flavor.military}</p>
        <DossierFieldRow label="Doctrine" value={fields.doctrine} />
        <DossierFieldRow label="Difficulty" value={`${fields.difficulty} / 5`} />
        <DossierFieldRow label="Likely rivals" value={fields.likelyRivals.join(", ")} />
      </div>
    ),
    diplomacy: (
      <div>
        <p className="font-mono text-[.85rem]">{flavor.diplomacy}</p>
        <DossierFieldRow label="Strategic regions" value={fields.strategicRegions} />
        <DossierFieldRow label="National characteristics" value={fields.nationalCharacteristics} />
      </div>
    ),
  };
}
