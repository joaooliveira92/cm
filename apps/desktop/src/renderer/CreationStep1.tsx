import { useState } from "react";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import {
  MANAGER_ARCHETYPES,
  MANAGER_ARCHETYPE_DISTRIBUTIONS,
  MANAGER_PILLARS,
  validatePillarDistribution,
} from "@cm-clone/shared";

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
        <label className="block text-sm font-medium text-slate-300">
          Save name
        </label>
        <input
          type="text"
          className="mt-1 block w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
          value={saveName}
          onChange={(e) => onSaveNameChange(e.target.value)}
          placeholder="My Career"
        />
      </section>

      <section>
        <label className="block text-sm font-medium text-slate-300">
          Manager name
        </label>
        <input
          type="text"
          className="mt-1 block w-full rounded bg-slate-800 px-3 py-2 text-slate-100"
          value={managerName}
          onChange={(e) => onManagerNameChange(e.target.value)}
          placeholder="Your name"
        />
      </section>

      <section>
        <h3 className="text-sm font-medium text-slate-300">Archetype</h3>
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
              <button
                key={arch}
                type="button"
                className={`rounded p-2 text-left text-sm ${
                  isSelected
                    ? "bg-slate-600 ring-2 ring-slate-400"
                    : "bg-slate-800 hover:bg-slate-700"
                }`}
                onClick={() => handleArchetypeSelect(arch)}
              >
                <div className="font-medium">{label}</div>
                {dist && (
                  <div className="mt-1 text-xs text-slate-400">
                    {dist.tacticalAcumen}/{dist.influence}/{dist.regimen}/
                    {dist.technicalCoaching}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-slate-300">
          Pillar Distribution
          {customMode && (
            <span className="ml-2 text-slate-500">(Custom)</span>
          )}
        </h3>
        <div className="mt-2 space-y-3">
          {MANAGER_PILLARS.map((pillar) => {
            const value = pillars[pillar];
            const isOne = value === 1;

            return (
              <div key={pillar} className="flex items-center gap-3">
                <span className="w-36 text-sm text-slate-300">
                  {PILLAR_DISPLAY_NAMES[pillar]}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded bg-slate-700 text-slate-100 hover:bg-slate-600 disabled:opacity-50"
                    onClick={() => handleCustomPillarChange(pillar, -1)}
                    disabled={value <= 1 || !customMode}
                  >
                    -
                  </button>
                  <span
                    className={`w-8 text-center ${
                      isOne ? "text-amber-400" : "text-slate-100"
                    }`}
                  >
                    {value}
                  </span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded bg-slate-700 text-slate-100 hover:bg-slate-600 disabled:opacity-50"
                    onClick={() => handleCustomPillarChange(pillar, 1)}
                    disabled={value >= 5 || !customMode}
                  >
                    +
                  </button>
                </div>
                {isOne && (
                  <span className="text-xs text-amber-400" title={PILLAR_WARNINGS[pillar]}>
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
                  ? "text-green-400"
                  : pointsRemaining > 0
                    ? "text-amber-400"
                    : "text-red-400"
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
          <div className="mt-2 text-sm text-red-400">
            {pillarErrors.map((error, i) => (
              <div key={i}>{error}</div>
            ))}
          </div>
        )}
      </section>

      {customMode && sum === 1 && (
        <section className="rounded bg-amber-900/20 p-3">
          <h4 className="text-sm font-medium text-amber-400">Pillar Warnings</h4>
          <ul className="mt-2 space-y-2 text-xs text-amber-300">
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
        </section>
      )}
    </div>
  );
};
