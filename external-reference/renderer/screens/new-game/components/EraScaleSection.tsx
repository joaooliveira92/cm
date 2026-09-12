import { memo } from "react";
import type { NewGameScenario } from "../../../../shared/new-game-contract.js";
import { CardContent, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "../../../components/ui/field.js";
import { Input } from "../../../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";
import { GlassCard } from "@/components/ui/glass-card.js";
import { fleetSizeLabel, fleetSizeReadout } from "../rules-of-the-naval-age-content.js";

export interface EraScaleSectionProps {
  readonly scenarioId: string;
  readonly campaignSeed: string;
  readonly fleetSize: string;
  readonly scenarios: readonly NewGameScenario[];
  readonly selectedScenario: NewGameScenario | null;
  readonly fleetSizeOptions: readonly string[];
  readonly onScenarioChange: (id: string) => void;
  readonly onFleetSizeChange: (value: string) => void;
  readonly onSeedChange: (seed: string) => void;
}

export const EraScaleSection = memo(function EraScaleSection({
  scenarioId,
  campaignSeed,
  fleetSize,
  scenarios,
  selectedScenario,
  fleetSizeOptions,
  onScenarioChange,
  onFleetSizeChange,
  onSeedChange,
}: EraScaleSectionProps) {
  return (
    <GlassCard glassVariant="liquid-refract">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Era &amp; Scale</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="scenario">Starting Era</FieldLabel>
            <Select value={scenarioId} onValueChange={onScenarioChange} className="w-full">
              <SelectTrigger id="scenario">
                <SelectValue placeholder="Select an era" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedScenario !== null && (
              <FieldDescription>
                Begins {selectedScenario.startMonth}/{selectedScenario.startYear} ·{" "}
                {selectedScenario.participantNationIds.length} nations
              </FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="fleetSize">Fleet Size</FieldLabel>
            <Select
              value={fleetSize}
              onValueChange={onFleetSizeChange}
              className="w-full"
              disabled={fleetSizeOptions.length <= 1}
            >
              <SelectTrigger id="fleetSize">
                <SelectValue placeholder="Select fleet size" />
              </SelectTrigger>
              <SelectContent>
                {fleetSizeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {fleetSizeLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fleetSize !== "" && <FieldDescription>{fleetSizeReadout(fleetSize)}</FieldDescription>}
          </Field>

          <Field>
            <FieldLabel htmlFor="campaignSeed">Campaign Seed</FieldLabel>
            <Input
              id="campaignSeed"
              name="campaignSeed"
              value={campaignSeed}
              onChange={(event) => onSeedChange(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              inputMode="none"
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </GlassCard>
  );
});
