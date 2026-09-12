import type { ArchetypeSelection } from "@bluewave/campaign-engine";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button.js";
import { GlassCard } from "../../components/ui/glass-card.js";
import { Table, TableBody, TableCell, TableRow } from "../../components/ui/table.js";
import type { SetPrimaryAction } from "../../shell/primary-action.js";
import { ScreenHeader } from "./components/ScreenHeader.js";
import type { FleetMethodDraft } from "./new-game-fleet-method-screen-state.js";
import type { CampaignIdentityDraft } from "./new-game-identity-screen-state.js";
import {
  activePresetAnnotation,
  buildStrategicForecast,
  buildSummaryRows,
} from "./new-game-commissioning-review-screen-state.js";
import type { DraftPreferences } from "./new-game-preferences-screen-state.js";
import type { NewGameOptions } from "../../../shared/new-game-contract.js";

export interface NewGameCommissioningReviewScreenProps {
  readonly nationId: string;
  readonly options: NewGameOptions | null;
  readonly preferences: DraftPreferences;
  readonly archetype: ArchetypeSelection;
  readonly identity: CampaignIdentityDraft;
  readonly fleetMethod: FleetMethodDraft;
  readonly status: "ready" | "launching";
  readonly error: string | null;
  readonly onBack: () => void;
  readonly onBeginCommission: () => void;
  readonly onPrimaryActionChange: SetPrimaryAction;
}

export function NewGameCommissioningReviewScreen({
  nationId,
  options,
  preferences,
  archetype,
  identity,
  fleetMethod,
  status,
  error,
  onBack,
  onBeginCommission,
  onPrimaryActionChange,
}: NewGameCommissioningReviewScreenProps) {
  const launching = status === "launching";

  const onBeginRef = useRef(onBeginCommission);
  onBeginRef.current = onBeginCommission;
  const triggerBegin = useCallback(() => {
    onBeginRef.current();
  }, []);

  useEffect(() => {
    onPrimaryActionChange({
      label: launching ? "Commissioning…" : "Begin Commission",
      disabled: launching,
      onTrigger: triggerBegin,
    });
    return () => onPrimaryActionChange(null);
  }, [launching, triggerBegin, onPrimaryActionChange]);

  const rows = buildSummaryRows({
    nationId,
    options,
    preferences,
    archetype,
    identity,
    fleetMethod,
  });
  const presetLabel = activePresetAnnotation(preferences);
  const forecast = buildStrategicForecast(nationId, preferences);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto p-8">
      <ScreenHeader
        icon={<span>⚓</span>}
        title="Final commissioning review"
        description="Confirm every decision before your appointment is commissioned."
      />

      {error !== null && <p className="text-sm text-destructive">{error}</p>}

      <GlassCard glassVariant="liquid-refract">
        <div className="p-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Rules of the Naval Age: {presetLabel}
          </p>
          <Table aria-label="Commissioning summary">
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="font-medium text-muted-foreground">{row.label}</TableCell>
                  <TableCell>{row.value}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {forecast !== null && (
        <GlassCard glassVariant="liquid-refract">
          <div className="flex flex-col gap-3 p-4">
            <h2 className="text-sm font-semibold">
              Strategic forecast — {forecast.appointmentTitle}
            </h2>
            <p className="text-sm text-muted-foreground">{forecast.doctrine}</p>
            <p className="text-sm text-muted-foreground">{forecast.strategicRegions}</p>
            <p className="text-sm text-muted-foreground">{forecast.nationalCharacteristics}</p>
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Expected pressures
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {forecast.expectedPressures.map((pressure) => (
                  <li key={pressure}>{pressure}</li>
                ))}
              </ul>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={launching}>
          Back to Fleet Method
        </Button>
      </div>
    </div>
  );
}
