import { useState } from "react";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import {
  MANAGER_ARCHETYPES,
  MANAGER_ARCHETYPE_DISTRIBUTIONS,
  MANAGER_PILLARS,
  validatePillarDistribution,
} from "@cm-clone/shared";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import { Label } from "./components/ui/label.js";

export interface CreationStep1Props {
  saveName: string;
  managerName: string;
  archetype: ManagerArchetype;
  pillars: PillarDistribution;
  onSaveNameChange: (name: string) => void;
  onManagerNameChange: (name: string) => void;
  onArchetypeChange: (archetype: ManagerArchetype) => void;
  onPillarsChange: (pillars: PillarDistribution) => void;
}

const PILLAR_DISPLAY_NAMES: Record<string, string> = {
  tacticalAcumen: "Tactical Acumen",
  influence: "Influence",
  regimen: "Regimen",
  technicalCoaching: "Technical Coaching",
};

const PILLAR_WARNINGS: Record<string, string> = {
  tacticalAcumen:
    "Low tactical acumen means your tactical instructions have minimal effect on match outcomes. Your players will follow generic instructions only.",
  influence:
    "Low influence makes it harder to negotiate with selling clubs. Counter-offers will be less favorable and rejections more common.",
  regimen:
    "Low regimen means players lose condition faster between matches and recover more slowly. Squad fitness management will be challenging.",
  technicalCoaching:
    "Low technical coaching means focused player development has minimal effect. Academy players and potential gains from training focus will be minimal.",
};

export const CreationStep1 = ({
  saveName,
  managerName,
  archetype,
  pillars,
  onSaveNameChange,
  onManagerNameChange,
  onArchetypeChange,
  onPillarsChange,
}: CreationStep1Props) => {
  const [customMode, setCustomMode] = useState(archetype === "custom");

  const handleArchetypeSelect = (selected: ManagerArchetype) => {
    if (selected === "custom") {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      onArchetypeChange(selected);
      onPillarsChange(MANAGER_ARCHETYPE_DISTRIBUTIONS[selected]);
    }
  };

  const handleCustomPillarChange = (pillar: string, delta: number) => {
    const currentValue = pillars[pillar as keyof PillarDistribution];
    const newValue = Math.max(1, Math.min(5, currentValue + delta));
    if (newValue !== currentValue) {
      onPillarsChange({
        ...pillars,
        [pillar]: newValue,
      });
    }
  };

  const sum = Object.values(pillars).reduce((a, b) => a + b, 0);
  const pointsRemaining = 12 - sum;

  const pillarErrors = validatePillarDistribution(pillars);

  return (
    <div className="space-y-6">
      <section>
        <Label className="block text-text-body" htmlFor="saveName">
          Save name
        </Label>
        <Input
          id="saveName"
          type="text"
          className="mt-1"
          value={saveName}
          onChange={(e) => onSaveNameChange(e.target.value)}
          placeholder="My Career"
        />
      </section>

      <section>
        <Label className="block text-text-body" htmlFor="managerName">
          Manager name
        </Label>
        <Input
          id="managerName"
          type="text"
          className="mt-1"
          value={managerName}
          onChange={(e) => onManagerNameChange(e.target.value)}
          placeholder="Your name"
        />
      </section>

      <section>
        <h3 className="text-sm font-medium text-text-body">Archetype</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MANAGER_ARCHETYPES.map((arch) => {
            const isSelected = customMode
              ? arch === "custom"
              : arch === archetype;
            const dist = arch === "custom" ? null : MANAGER_ARCHETYPE_DISTRIBUTIONS[arch];
            const label =
              arch === "professor"
                ? "Professor"
                : arch === "motivator"
                  ? "Motivator"
                  : arch === "sergeant"
                    ? "Sergeant"
                    : arch === "academy_head"
                      ? "Academy Head"
                      : "Custom";

            return (
              <Button
                key={arch}
                type="button"
                variant={isSelected ? "default" : "secondary"}
                aria-pressed={isSelected}
                className="h-auto flex-col items-start p-2 text-left"
                onClick={() => handleArchetypeSelect(arch)}
              >
                <div className="font-medium">{label}</div>
                {dist && (
                  <div className="text-2xs text-text-secondary">
                    {dist.tacticalAcumen}/{dist.influence}/{dist.regimen}/
                    {dist.technicalCoaching}
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-text-body">
          Pillar Distribution
          {customMode && (
            <span className="ml-2 text-text-muted">(Custom)</span>
          )}
        </h3>
        <div className="mt-2 space-y-3">
          {MANAGER_PILLARS.map((pillar) => {
            const value = pillars[pillar];
            const isOne = value === 1;

            return (
              <div key={pillar} className="flex items-center gap-3">
                <span className="w-36 text-sm text-text-body">
                  {PILLAR_DISPLAY_NAMES[pillar]}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => handleCustomPillarChange(pillar, -1)}
                    disabled={value <= 1 || !customMode}
                  >
                    -
                  </Button>
                  <span
                    className={`w-8 text-center ${
                      isOne ? "text-text-warning" : "text-text-primary"
                    }`}
                  >
                    {value}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => handleCustomPillarChange(pillar, 1)}
                    disabled={value >= 5 || !customMode}
                  >
                    +
                  </Button>
                </div>
                {isOne && (
                  <span className="text-xs text-text-warning" title={PILLAR_WARNINGS[pillar]}>
                    ⚠️
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {customMode && (
          <div className="mt-3 text-sm">
            <span
              className={
                pointsRemaining === 0
                  ? "text-text-success"
                  : pointsRemaining > 0
                    ? "text-text-warning"
                    : "text-destructive"
              }
            >
              {pointsRemaining > 0
                ? `${pointsRemaining} point${pointsRemaining !== 1 ? "s" : ""} remaining`
                : pointsRemaining < 0
                  ? `${Math.abs(pointsRemaining)} point${Math.abs(pointsRemaining) !== 1 ? "s" : ""} over`
                  : "Ready to submit"}
            </span>
          </div>
        )}

        {pillarErrors.length > 0 && customMode && (
          <div className="mt-2 text-sm text-destructive">
            {pillarErrors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        )}
      </section>

      {customMode && sum === 1 && (
        <Alert className="border-text-warning/40 bg-text-warning/10">
          <h4 className="text-sm font-medium text-text-warning">Pillar Warnings</h4>
          <ul className="mt-2 space-y-2 text-2xs text-text-warning">
            {MANAGER_PILLARS.map(
              (pillar) =>
                pillars[pillar] === 1 && (
                  <li key={pillar}>
                    <strong>{PILLAR_DISPLAY_NAMES[pillar]}:</strong>{" "}
                    {PILLAR_WARNINGS[pillar]}
                  </li>
                ),
            )}
          </ul>
        </Alert>
      )}
    </div>
  );
};
