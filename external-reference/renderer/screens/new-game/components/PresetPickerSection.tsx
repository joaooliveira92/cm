import { memo } from "react";
import { CardContent, CardHeader, CardTitle } from "../../../components/ui/card.js";
import { GlassCard } from "@/components/ui/glass-card.js";
import { cn } from "../../../lib/utils.js";
import {
  PRESET_DEFINITIONS,
  type ActivePresetId,
  type PresetId,
} from "../rules-of-the-naval-age-presets.js";

export interface PresetPickerSectionProps {
  readonly activePreset: ActivePresetId;
  readonly onSelectPreset: (presetId: PresetId) => void;
}

const PILL_CLASSES =
  "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors disabled:cursor-default";

export const PresetPickerSection = memo(function PresetPickerSection({
  activePreset,
  onSelectPreset,
}: PresetPickerSectionProps) {
  return (
    <GlassCard glassVariant="liquid-refract">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Rules of the Naval Age</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PRESET_DEFINITIONS.map((preset) => {
            const active = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset.id)}
                aria-pressed={active}
                className={cn(
                  PILL_CLASSES,
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <span className="text-sm font-semibold">{preset.name}</span>
                <span className="text-xs text-muted-foreground">{preset.tagline}</span>
              </button>
            );
          })}
          <button
            type="button"
            disabled
            aria-pressed={activePreset === "custom"}
            className={cn(
              PILL_CLASSES,
              "items-center justify-center text-center border-dashed",
              activePreset === "custom" ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <span className="text-sm font-semibold">Custom</span>
            <span className="text-xs text-muted-foreground">Your current settings</span>
          </button>
        </div>
      </CardContent>
    </GlassCard>
  );
});
