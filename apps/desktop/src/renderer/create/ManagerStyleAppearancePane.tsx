import { FORMATIONS, TACTICAL_STYLE_PRESETS } from "@cm-clone/shared";
import type { Formation, TacticalStylePreset } from "@cm-clone/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { Label } from "../components/ui/label.js";
import { FOCUS_RING } from "../focus.js";
import { cn } from "../lib/utils.js";
import { AVATAR_PALETTE, STYLE_LABELS, styleAxisSummary } from "./managerStyleCopy.js";

export interface ManagerStyleAppearancePaneProps {
  readonly preferredFormation: Formation | null;
  readonly preferredStyleId: TacticalStylePreset | null;
  readonly avatarPrimaryColor: string;
  readonly avatarSecondaryColor: string;
  readonly onFormationChange: (formation: Formation) => void;
  readonly onStyleChange: (style: TacticalStylePreset) => void;
  readonly onAvatarChange: (primary: string, secondary: string) => void;
}

/**
 * The Manager step's third panel: the manager's tactical identity and appearance. It collects the
 * two required preferences — a formation and a Tactical Style, both unset until picked, so the
 * panel is a real step — and the optional avatar accent scheme.
 *
 * The style cards carry the axes each preset seeds (`styleAxisSummary`), so the picker says what it
 * will do rather than only naming a football idiom. The palette is a fixed set of accent pairs, not
 * a colour wheel: contrast is guaranteed by construction and a swatch is a stable test target.
 */
export const ManagerStyleAppearancePane = ({
  preferredFormation,
  preferredStyleId,
  avatarPrimaryColor,
  avatarSecondaryColor,
  onFormationChange,
  onStyleChange,
  onAvatarChange,
}: ManagerStyleAppearancePaneProps) => (
  <>
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
        Step 3
      </span>
      <h2 className="mt-2 text-2xl font-bold text-text-primary">Style & Appearance</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Set the tactical identity your first formation starts from, and how you appear.
      </p>
    </div>

    <div className="rounded-panel border border-panel-border bg-card p-6 shadow-panel">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label className="block">Preferred formation</Label>
          <Select
            value={preferredFormation ?? ""}
            onValueChange={(value) => {
              if (value !== "" && value !== null) onFormationChange(value as Formation);
            }}
          >
            <SelectTrigger aria-label="Preferred formation" className="mt-2">
              <SelectValue placeholder="Select a formation" />
            </SelectTrigger>
            <SelectContent>
              {FORMATIONS.map((formation) => (
                <SelectItem key={formation} value={formation}>
                  {formation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs text-text-muted">
            The shape your first Tactic opens in.
          </p>
        </div>

        <div>
          <Label className="block">Avatar colours</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {AVATAR_PALETTE.map((option) => {
              const selected =
                option.primary === avatarPrimaryColor &&
                option.secondary === avatarSecondaryColor;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={option.label}
                  aria-pressed={selected}
                  onClick={() => onAvatarChange(option.primary, option.secondary)}
                  className={cn(
                    "flex items-center gap-2 rounded-control border px-2 py-1.5 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-text-primary"
                      : "border-border-subtle bg-field-bg text-text-body hover:bg-surface-raised",
                    ...FOCUS_RING,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-5 shrink-0 overflow-hidden rounded-full border border-border-subtle"
                  >
                    <span className="h-full w-1/2" style={{ backgroundColor: option.primary }} />
                    <span className="h-full w-1/2" style={{ backgroundColor: option.secondary }} />
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Your colours and initials stand in for a portrait.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="font-semibold text-text-primary">Tactical style</h3>
        <p className="mt-1 text-sm text-text-secondary">
          The starting instructions your first Tactic is seeded with.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TACTICAL_STYLE_PRESETS.map((style) => {
            const selected = style === preferredStyleId;
            return (
              <button
                key={style}
                type="button"
                aria-label={STYLE_LABELS[style]}
                aria-pressed={selected}
                onClick={() => onStyleChange(style)}
                className={cn(
                  "rounded-panel border p-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-panel-border bg-panel-bg hover:bg-surface-raised",
                  ...FOCUS_RING,
                )}
              >
                <span className="block text-sm font-semibold text-text-primary">
                  {STYLE_LABELS[style]}
                </span>
                <span className="mt-1 block text-xs text-text-muted">{styleAxisSummary(style)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </>
);
