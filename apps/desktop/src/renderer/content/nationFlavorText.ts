import type { PlayableSlotCountryId } from "./nationAssetManifest.js";

/**
 * Presentation-only flavor text for each canonical playable slot (CONTEXT.md §4).
 *
 * These strings reflect the nation's 1880 starting position across three
 * dimensions: economy, military status, and diplomatic posture. They are
 * static content-pack text keyed by stable country id — never authoritative
 * state and never localized in a way that could feed back into simulation
 * (ADR-0003, CONTEXT.md §5).
 */
export type NationFlavorText = {
  /** The nation's canonical display name. */
  name: string;
  /** Economic character: industrial base, revenue, fiscal health. */
  economy: string;
  /** Military posture: fleet size, land forces, modernisation. */
  military: string;
  /** Diplomatic outlook: fears, ambitions, treaty commitments. */
  diplomacy: string;
};

export const NATION_FLAVOR_TEXT: Record<PlayableSlotCountryId, NationFlavorText> = {
  gb: {
    name: "United Kingdom",
    economy:
      "The world's foremost industrial power, sustained by empire-wide trade and unrivalled colonial revenues. The City of London finances navies and railways on every continent.",
    military:
      "The Royal Navy holds undisputed command of the seas. The two-power standard demands a battle fleet stronger than the next two naval powers combined, a bar set deliberately out of reach.",
    diplomacy:
      "Britain fears a Franco-Russian entente that could threaten trade routes and colonial possessions simultaneously. The priority is preserving the balance of power without a costly continental commitment.",
  },
  de: {
    name: "German Empire",
    economy:
      "A rapidly industrialising colossus — steel output already challenging Britain's, chemical and electrical industries decades ahead of their rivals. Prussia's fiscal discipline underpins every programme.",
    military:
      "The most powerful land army in the world, but a navy still in its infancy. Strategic ambition is building pressure to match industrial growth with blue-water capability.",
    diplomacy:
      "Berlin fears encirclement by a Franco-Russian alliance and works to keep the two apart. Colonial ambitions are growing, putting steady friction into relations with London and Paris.",
  },
  us: {
    name: "United States",
    economy:
      "Continental expansion has created a vast internal market; industrialisation is accelerating. The economy is the largest in the Americas and growing fast, though it remains inward-looking.",
    military:
      "The Civil War navy has rusted to near-irrelevance. A modernisation programme is underway, but the fleet is still coastal-defence oriented — offensive sea power remains a prospect rather than a fact.",
    diplomacy:
      "The Monroe Doctrine insists the Western Hemisphere is a closed sphere. Washington fears European intervention in Latin American affairs above all else, and watches the Pacific with growing interest.",
  },
  jp: {
    name: "Empire of Japan",
    economy:
      "The Meiji government is industrialising at breakneck speed. Traditional feudal revenues are giving way to modern taxation, but foreign exchange is scarce and heavy industry is still in its infancy.",
    military:
      "The army is reorganised on French lines; the embryonic navy is acquiring foreign-built warships. Both services are improving rapidly, though foreign advisers still fill key gaps.",
    diplomacy:
      "Tokyo seeks treaty revision to escape the unequal agreements imposed by the Western powers. Its primary fear is Russian southward expansion cutting off Korea — a buffer Japan considers vital.",
  },
  fr: {
    name: "French Republic",
    economy:
      "A wealthy but slower-growing economy compared to Germany and Britain. Colonial revenues are rising, but the Franco-Prussian indemnity left scars and the birth rate lags behind rivals.",
    military:
      "The army is rebuilt and enlarged since 1871, consumed by revanchism for Alsace-Lorraine. The navy is the world's second largest by tonnage but starved of funds compared with the army.",
    diplomacy:
      "Paris fears German aggression above all and actively courts Russian friendship to avoid fighting alone. Colonial rivalry with Britain over Africa and south-east Asia is a persistent secondary tension.",
  },
  it: {
    name: "Kingdom of Italy",
    economy:
      "Unification is recent and the south remains mired in poverty. Industry is concentrated in the north and heavily dependent on imported coal. State finances are under chronic strain.",
    military:
      "The army is large by necessity but poorly equipped. The navy is ambitious — Italy sees sea power as the only path to great-power status — but funds are limited and shipyards are still developing.",
    diplomacy:
      "Rome covets the Adriatic coast and a voice in the Mediterranean. Its fears are Austria-Hungary to the north and France to the west. The Triple Alliance provides cover but limits freedom of action.",
  },
  ru: {
    name: "Russian Empire",
    economy:
      "Vast natural resources but chronically underdeveloped. Railway construction is the central modernisation project. Foreign loans sustain the budget, and serfdom's recent abolition disrupts traditional agricultural revenues.",
    military:
      "The largest army in the world by manpower, though logistics over vast distances limit its effectiveness. The navy is divided between Baltic, Black Sea, and Pacific — powerful on paper, overstretched in practice.",
    diplomacy:
      "St Petersburg pursues warm-water ports with persistence — in the Black Sea, in the Far East, and through the Balkans. It fears British resistance in the south and Austro-Hungarian competition for Slavic influence.",
  },
  ah: {
    name: "Austro-Hungarian Empire",
    economy:
      "A dual monarchy of uneven halves — industrial Bohemia and Vienna on one side, agrarian Hungary on the other. Internal customs disputes slow modernisation; the empire punches below its potential weight.",
    military:
      "A substantial land army stretched thin along long frontiers. The navy operates only in the Adriatic and is modest in ambition, though technologically capable.",
    diplomacy:
      "Vienna's primary fear is Russian-backed pan-Slavic nationalism dissolving the empire from within. Ambitions in the Balkans are constrained by the need to avoid triggering a general war with St Petersburg.",
  },
  es: {
    name: "Kingdom of Spain",
    economy:
      "Colonial revenues are declining as Cuba and the Philippines demand expensive garrisons. The domestic economy is agricultural and slow to industrialise; state finances are precarious.",
    military:
      "An ageing fleet, mostly of iron warships that missed the last generation of modernisation. Manpower is available but the defence budget cannot support a sustained naval programme.",
    diplomacy:
      "Madrid's overriding concern is protecting Cuba, the Philippines, and the remaining colonial estate. The rising power of the United States in the Western Hemisphere is watched with growing unease.",
  },
  qing: {
    name: "Qing Dynasty",
    economy:
      "An enormous economy on paper — the world's most populous state — but commercially stagnant under unfavourable treaty tariffs and lacking modern industry. Foreign loans are the only source of capital for naval programmes.",
    military:
      "Modernisation is fragmented across regional fleets with no unified command. The Beiyang Fleet is the strongest, equipped with German-built ironclads, but discipline and logistics remain weak.",
    diplomacy:
      "Peking fears partition by the European powers most of all, with Britain pressing from the south, Russia from the north, France from Indochina, and Japan emerging as a new threat from the east.",
  },
};
