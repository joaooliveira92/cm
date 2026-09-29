import { useState } from "react";
import { Button } from "../components/ui/button.js";
import { cn } from "../lib/utils.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "../theme.js";
import {
  applyAppearance,
  BASE_COLORS,
  loadAppearance,
  saveAppearance,
  THEME_COLORS,
  type Appearance,
  type AppearanceOption,
} from "./appearance.js";

export interface PreferencesDialogProps {
  readonly onClose: () => void;
}

/**
 * Application preferences: today, the two shadcn colour axes. A choice applies
 * and persists the moment it is made, so the dialog previews by being the
 * setting — Done only closes it.
 */
export const PreferencesDialog = ({ onClose }: PreferencesDialogProps) => {
  const [appearance, setAppearance] = useState<Appearance>(() => loadAppearance());

  const choose = (next: Appearance) => {
    setAppearance(next);
    applyAppearance(next);
    saveAppearance(next);
  };

  return (
    <div
      className={MODAL_SCRIM}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Preferences"
        className={cn(MODAL_COMPACT, "max-w-md")}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="text-heading">Preferences</h2>
        </div>
        <div className={cn(MODAL_BODY, "flex flex-col gap-4")}>
          <SwatchGroup
            legend="Base color"
            name="base-color"
            options={BASE_COLORS}
            value={appearance.baseColor}
            onChange={(baseColor) => choose({ ...appearance, baseColor })}
          />
          <SwatchGroup
            legend="Theme color"
            name="theme-color"
            options={THEME_COLORS}
            value={appearance.themeColor}
            onChange={(themeColor) => choose({ ...appearance, themeColor })}
          />
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface SwatchGroupProps<Id extends string> {
  readonly legend: string;
  readonly name: string;
  readonly options: ReadonlyArray<AppearanceOption<Id>>;
  readonly value: Id;
  readonly onChange: (id: Id) => void;
}

/** A native radio group drawn as swatch chips: arrow keys, Tab, and the
 *  accessible name all come from the platform. */
const SwatchGroup = <Id extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: SwatchGroupProps<Id>) => (
  <fieldset className="flex flex-col gap-2">
    <legend className="mb-2 text-data font-medium text-text-secondary">{legend}</legend>
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <label
          key={option.id}
          className={cn(
            "flex cursor-pointer items-center gap-1.5 rounded-control border px-2 py-1 text-data",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            option.id === value
              ? "border-primary bg-surface-raised text-text-primary"
              : "border-border-subtle text-text-body hover:bg-surface-raised",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={option.id === value}
            onChange={() => onChange(option.id)}
            className="sr-only"
          />
          <span
            aria-hidden="true"
            className="size-3 rounded-full border border-border-subtle"
            style={{ backgroundColor: option.swatch }}
          />
          {option.label}
        </label>
      ))}
    </div>
  </fieldset>
);
