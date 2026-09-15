import { Anchor } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { NewGameOptions } from "../../../shared/new-game-contract.js";
import { Button } from "../../components/ui/button.js";
import type { AdmiralPresetValues } from "./admiral-preset.js";
import { EraScaleSection } from "./components/EraScaleSection.js";
import { ErrorState } from "./components/ErrorState.js";
import { HistoricalUncertaintySection } from "./components/HistoricalUncertaintySection.js";
import { LoadingState } from "./components/LoadingState.js";
import { PresetPickerSection } from "./components/PresetPickerSection.js";
import { ScreenHeader } from "./components/ScreenHeader.js";
import type {
  DraftPreferences,
  NewGamePreferencesScreenState,
} from "./new-game-preferences-screen-state.js";
import {
  applyOptionsFailed,
  applyOptionsLoaded,
  initialNewGamePreferencesScreenState,
  isReadyToProceed,
  selectedScenario,
  updatePreference,
} from "./new-game-preferences-screen-state.js";
import {
  applyPreset,
  detectActivePreset,
  type PresetId,
} from "./rules-of-the-naval-age-presets.js";
import { defaultCampaignSeed } from "./utils/campaign-seed.js";

export interface RulesOfTheNavalAgeScreenProps {
  readonly recommendedPreset: AdmiralPresetValues | null;
  readonly onCancel: () => void;
  readonly onNext: (preferences: DraftPreferences, options: NewGameOptions) => void;
}

export function RulesOfTheNavalAgeScreen({
  recommendedPreset,
  onCancel,
  onNext,
}: RulesOfTheNavalAgeScreenProps) {
  const bridge = window.bluewave;
  const [state, setState] = useState<NewGamePreferencesScreenState>(
    initialNewGamePreferencesScreenState,
  );
  const recommendedPresetRef = useRef(recommendedPreset);

  useEffect(() => {
    async function loadOptions(): Promise<void> {
      if (bridge === undefined) {
        setState((current) => applyOptionsFailed(current, "Bluewave bridge not available"));
        return;
      }
      const result = await bridge.campaign.execute("listNewGameOptions", undefined);
      if (result.outcome !== "success") {
        setState((current) => applyOptionsFailed(current, result.reason));
        return;
      }
      setState((current) =>
        applyOptionsLoaded(
          current,
          result.value,
          defaultCampaignSeed(),
          recommendedPresetRef.current,
        ),
      );
    }
    void loadOptions();
  }, [bridge]);

  const scenario = selectedScenario(state);
  const ready = isReadyToProceed(state);
  const options = state.options;
  const preferences = state.preferences;
  const activePreset = detectActivePreset(preferences);

  const handlePreferenceChange = useCallback((field: keyof DraftPreferences, value: string) => {
    setState((current) => updatePreference(current, field, value));
  }, []);

  const onScenarioChange = useCallback((value: string) => {
    setState((current) => updatePreference(current, "scenarioId", value));
  }, []);

  const onFleetSizeChange = useCallback((value: string) => {
    setState((current) => updatePreference(current, "fleetSize", value));
  }, []);

  const onSeedChange = useCallback((value: string) => {
    setState((current) => updatePreference(current, "campaignSeed", value));
  }, []);

  const onSelectPreset = useCallback((presetId: PresetId) => {
    setState((current) => ({
      ...current,
      preferences: applyPreset(current.preferences, presetId),
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (options !== null && ready) onNext(preferences, options);
  }, [options, ready, preferences, onNext]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <ScreenHeader
        icon={<Anchor className="h-5 w-5" />}
        title="Rules of the Naval Age"
        description="Set the era, scale, and historical uncertainty for this campaign."
      />

      {state.loading && <LoadingState message="Loading campaign options…" />}

      {state.error !== null && (
        <ErrorState message={`Failed to load campaign options: ${state.error}`} />
      )}

      {options !== null && (
        <>
          <PresetPickerSection activePreset={activePreset} onSelectPreset={onSelectPreset} />

          <EraScaleSection
            scenarioId={preferences.scenarioId}
            campaignSeed={preferences.campaignSeed}
            fleetSize={preferences.fleetSize}
            scenarios={options.scenarios}
            selectedScenario={scenario}
            fleetSizeOptions={options.supportedValues.fleetSize ?? []}
            onScenarioChange={onScenarioChange}
            onFleetSizeChange={onFleetSizeChange}
            onSeedChange={onSeedChange}
          />

          <HistoricalUncertaintySection
            preferences={preferences}
            supportedValues={options.supportedValues}
            onPreferenceChange={handlePreferenceChange}
          />
        </>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button type="button" onClick={handleNext} disabled={!ready}>
          Next: Choose Archetype
        </Button>
      </div>
    </div>
  );
}
