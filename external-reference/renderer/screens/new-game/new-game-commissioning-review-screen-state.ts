import { findPreset, type ArchetypeSelection } from "@bluewave/campaign-engine";
import {
  NATION_DOSSIER_FIELDS,
  type NationDossierFields,
} from "../../content/nationDossierFields.js";
import { isPlayableSlotCountryId } from "../../content/nationPresentationCatalog.js";
import { NATION_PRESENTATION_CATALOG } from "../../content/nationPresentationCatalog.js";
import type { NewGameOptions } from "../../../shared/new-game-contract.js";
import type { FleetMethodDraft } from "./new-game-fleet-method-screen-state.js";
import { FLEET_METHOD_CARDS } from "./fleet-method-content.js";
import {
  type CampaignIdentityDraft,
  type IdentityFieldOption,
  MEASUREMENT_SYSTEM_OPTIONS,
  NAMING_CONVENTION_OPTIONS,
  SHIP_NAME_REUSE_OPTIONS,
} from "./new-game-identity-screen-state.js";
import type { DraftPreferences } from "./new-game-preferences-screen-state.js";
import {
  fleetSizeLabel,
  fleetSizeReadout,
  uncertaintyValueContent,
  UNCERTAINTY_FIELDS,
  UNCERTAINTY_FIELD_LABELS,
} from "./rules-of-the-naval-age-content.js";
import { detectActivePreset, PRESET_DEFINITIONS } from "./rules-of-the-naval-age-presets.js";

/**
 * Final commissioning review screen (spec §6) — reuses the exact settled
 * vocabulary from §1/§2/§3/§5 verbatim rather than re-inventing labels. Pure
 * functions here are the summary table's/forecast panel's templating logic,
 * kept separate from `NewGameCommissioningReviewScreen.tsx` so they're
 * testable without rendering.
 */

export interface CommissioningReviewInput {
  readonly nationId: string;
  readonly options: NewGameOptions | null;
  readonly preferences: DraftPreferences;
  readonly archetype: ArchetypeSelection;
  readonly identity: CampaignIdentityDraft;
  readonly fleetMethod: FleetMethodDraft;
}

export interface SummaryRow {
  readonly label: string;
  readonly value: string;
}

function identityLabel<V extends string>(
  options: ReadonlyArray<IdentityFieldOption<V>>,
  value: V,
): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function nationLabel(nationId: string): string {
  return isPlayableSlotCountryId(nationId) ? NATION_PRESENTATION_CATALOG[nationId].name : nationId;
}

function eraLabel(options: NewGameOptions | null, scenarioId: string): string {
  return options?.scenarios.find((scenario) => scenario.id === scenarioId)?.name ?? scenarioId;
}

function fleetMethodLabel(legacyFleetModeId: string): string {
  return (
    FLEET_METHOD_CARDS.find((card) => card.id === legacyFleetModeId)?.title ?? legacyFleetModeId
  );
}

function archetypeLabel(archetype: ArchetypeSelection): string {
  if (archetype.kind === "custom") return "Custom";
  return findPreset(archetype.id)?.name ?? archetype.id;
}

/** Builds the summary table's 15 rows (spec §6), top to bottom, verbatim order. */
export function buildSummaryRows(input: CommissioningReviewInput): readonly SummaryRow[] {
  const { nationId, options, preferences, archetype, identity, fleetMethod } = input;
  const uncertaintyRows = UNCERTAINTY_FIELDS.map((field) => ({
    label: UNCERTAINTY_FIELD_LABELS[field],
    value: uncertaintyValueContent(field, preferences[field]).label,
  }));
  return [
    { label: "Nation", value: nationLabel(nationId) },
    { label: "Era", value: eraLabel(options, preferences.scenarioId) },
    { label: "Fleet size", value: fleetSizeLabel(preferences.fleetSize) },
    ...uncertaintyRows,
    { label: "Starting fleet method", value: fleetMethodLabel(fleetMethod.legacyFleetModeId) },
    { label: "Archetype", value: archetypeLabel(archetype) },
    {
      label: "Naming convention",
      value: identityLabel(NAMING_CONVENTION_OPTIONS, identity.namingConvention),
    },
    {
      label: "Ship name reuse",
      value: identityLabel(SHIP_NAME_REUSE_OPTIONS, identity.shipNameReuse),
    },
    {
      label: "Measurement system",
      value: identityLabel(MEASUREMENT_SYSTEM_OPTIONS, identity.measurementSystem),
    },
    { label: "Admiral", value: identity.admiralName },
    { label: "Campaign name", value: identity.campaignName },
  ];
}

/** "Rules of the Naval Age: <preset>" annotation, or "Custom" if none active (spec §6). */
export function activePresetAnnotation(preferences: DraftPreferences): string {
  const activeId = detectActivePreset(preferences);
  if (activeId === "custom") return "Custom";
  return PRESET_DEFINITIONS.find((preset) => preset.id === activeId)?.name ?? "Custom";
}

export interface StrategicForecast {
  readonly appointmentTitle: string;
  readonly doctrine: string;
  readonly strategicRegions: string;
  readonly nationalCharacteristics: string;
  readonly expectedPressures: readonly string[];
}

const SIX_SETTING_FIELDS = [
  "fleetSize",
  "researchSpeed",
  "technologyVariation",
  "historicalBudget",
  "tacticalRealism",
  "difficulty",
] as const;

/**
 * Templated strategic forecast (spec §6) — constant part from §1's per-nation
 * dossier fields, "Expected pressures" mechanically keyed off the chosen
 * settings, reusing §2's qualitative blurbs. No per-nation×era authoring.
 */
export function buildStrategicForecast(
  nationId: string,
  preferences: DraftPreferences,
): StrategicForecast | null {
  if (!isPlayableSlotCountryId(nationId)) return null;
  const dossier: NationDossierFields = NATION_DOSSIER_FIELDS[nationId];
  const expectedPressures = SIX_SETTING_FIELDS.map((field) =>
    field === "fleetSize"
      ? fleetSizeReadout(preferences.fleetSize)
      : uncertaintyBlurb(field, preferences),
  ).filter((blurb) => blurb.length > 0);

  return {
    appointmentTitle: dossier.appointmentTitle,
    doctrine: dossier.doctrine,
    strategicRegions: dossier.strategicRegions,
    nationalCharacteristics: dossier.nationalCharacteristics,
    expectedPressures,
  };
}

function uncertaintyBlurb(
  field: Exclude<(typeof SIX_SETTING_FIELDS)[number], "fleetSize">,
  preferences: DraftPreferences,
): string {
  return uncertaintyValueContent(field, preferences[field]).blurb;
}
