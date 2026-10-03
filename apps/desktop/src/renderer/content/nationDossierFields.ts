import type { PlayableSlotCountryId } from "./nationAssetManifest.js";

/**
 * Presentation-only nation-confirmation dossier fields (game-onboarding INC-2,
 * spec §1). Hand-authored per playable nation, same static content-pack
 * pattern as `nationFlavorText.ts` (ADR-0003) — no engine data backs any of
 * this; `difficulty` is a fixed cosmetic tier (1 easiest–5 hardest) tracking
 * complexity of commitments, not fleet size.
 */
export interface NationDossierFields {
  readonly appointmentTitle: string;
  readonly doctrine: string;
  readonly strategicRegions: string;
  readonly budgetCategory: string;
  readonly shipbuildingCapacity: string;
  readonly researchStrengths: string;
  readonly researchWeaknesses: string;
  readonly nationalCharacteristics: string;
  readonly likelyRivals: readonly string[];
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
}

export const NATION_DOSSIER_FIELDS: Record<PlayableSlotCountryId, NationDossierFields> = {
  gb: {
    appointmentTitle: "First Sea Lord",
    doctrine: "Global sea control, two-power standard",
    strategicRegions: "North Sea, Mediterranean, Indian Ocean, Far East, overseas possessions",
    budgetCategory: "Very Large",
    shipbuildingCapacity: "World-leading",
    researchStrengths: "Capital ship design, naval gunnery",
    researchWeaknesses: "Overstretched budget across theaters",
    nationalCharacteristics: "Worldwide deployment burden; public expects naval supremacy",
    likelyRivals: ["Germany", "France", "Russia"],
    difficulty: 5,
  },
  de: {
    appointmentTitle: "State Secretary of the Imperial Naval Office",
    doctrine: "Risk fleet, high-seas concentration",
    strategicRegions: "North Sea, Baltic",
    budgetCategory: "Large",
    shipbuildingCapacity: "Advanced, fast-growing",
    researchStrengths: "Metallurgy, engine design",
    researchWeaknesses: "Shallow overseas basing network",
    nationalCharacteristics: "Rapid industrial expansion; political pressure to rival Britain",
    likelyRivals: ["United Kingdom", "France", "Russia"],
    difficulty: 4,
  },
  us: {
    appointmentTitle: "Chief of Naval Operations",
    doctrine: "Hemispheric defense, emerging blue-water ambition",
    strategicRegions: "Atlantic seaboard, Caribbean, Pacific coast",
    budgetCategory: "Large",
    shipbuildingCapacity: "Advanced, expanding fast",
    researchStrengths: "Industrial capacity, shipyard scale",
    researchWeaknesses: "Limited overseas basing, inexperienced officer corps",
    nationalCharacteristics: "Isolationist public opinion; growing two-ocean strategic problem",
    likelyRivals: ["United Kingdom", "Japan"],
    difficulty: 3,
  },
  fr: {
    appointmentTitle: "Chief of the Naval General Staff",
    doctrine: "Coastal defense plus colonial cruiser warfare",
    strategicRegions: "Mediterranean, Atlantic, colonial routes",
    budgetCategory: "Large",
    shipbuildingCapacity: "Advanced",
    researchStrengths: "Submarine and torpedo innovation",
    researchWeaknesses: "Fleet doctrine inconsistency between administrations",
    nationalCharacteristics: "Political instability affecting naval policy continuity",
    likelyRivals: ["Germany", "United Kingdom", "Italy"],
    difficulty: 4,
  },
  jp: {
    appointmentTitle: "Chief of the Imperial Japanese Navy General Staff",
    doctrine: "Decisive-battle doctrine, regional sea denial",
    strategicRegions: "Home waters, Yellow Sea, Western Pacific",
    budgetCategory: "Moderate, growing",
    shipbuildingCapacity: "Developing, rapidly modernizing",
    researchStrengths: "Crew discipline, torpedo tactics",
    researchWeaknesses: "Smaller industrial base than Western rivals",
    nationalCharacteristics: "Rapid modernization; strong national naval ambition",
    likelyRivals: ["Russia", "China", "United States"],
    difficulty: 3,
  },
  it: {
    appointmentTitle: "Chief of Staff of the Regia Marina",
    doctrine: "Mediterranean coastal defense",
    strategicRegions: "Central Mediterranean, Adriatic",
    budgetCategory: "Moderate",
    shipbuildingCapacity: "Developing",
    researchStrengths: "Cruiser and light-forces design",
    researchWeaknesses: "Limited heavy-industry capacity",
    nationalCharacteristics: "Constrained budget relative to ambitions",
    likelyRivals: ["France", "Austria-Hungary"],
    difficulty: 3,
  },
  ru: {
    appointmentTitle: "Chief of the Naval Staff",
    doctrine: "Fleet-in-being, coastal and regional defense",
    strategicRegions: "Baltic, Black Sea, Far East",
    budgetCategory: "Moderate",
    shipbuildingCapacity: "Developing, uneven",
    researchStrengths: "Numerical manpower",
    researchWeaknesses: "Split fleet across disconnected theaters, industrial backwardness",
    nationalCharacteristics: "Political instability; logistically fragmented navy",
    likelyRivals: ["Japan", "Germany", "United Kingdom"],
    difficulty: 3,
  },
  ah: {
    appointmentTitle: "Marinekommandant",
    doctrine: "Coastal and Adriatic defense",
    strategicRegions: "Adriatic Sea",
    budgetCategory: "Modest",
    shipbuildingCapacity: "Limited",
    researchStrengths: "Coastal fortification integration",
    researchWeaknesses: "Minimal blue-water experience",
    nationalCharacteristics: "Multi-ethnic empire constrains unified naval policy",
    likelyRivals: ["Italy"],
    difficulty: 2,
  },
  es: {
    appointmentTitle: "Chief of the Naval General Staff",
    doctrine: "Colonial and home-waters defense",
    strategicRegions: "Iberian coast, remaining colonial possessions",
    budgetCategory: "Limited",
    shipbuildingCapacity: "Minimal",
    researchStrengths: "Coastal familiarity",
    researchWeaknesses: "Post-1898 fleet rebuilding from a low base",
    nationalCharacteristics: "Recovering from recent naval losses; modest ambitions",
    likelyRivals: ["France", "United Kingdom"],
    difficulty: 1,
  },
  qing: {
    appointmentTitle: "Imperial Naval Commissioner",
    doctrine: "Coastal defense, treaty-port protection",
    strategicRegions: "Yellow Sea, coastal treaty ports",
    budgetCategory: "Limited",
    shipbuildingCapacity: "Minimal",
    researchStrengths: "Manpower reserves",
    researchWeaknesses: "Fragmented command, minimal domestic shipbuilding industry",
    nationalCharacteristics: "Foreign naval pressure in home waters; weak central industrial base",
    likelyRivals: ["Japan", "United Kingdom"],
    difficulty: 2,
  },
};
