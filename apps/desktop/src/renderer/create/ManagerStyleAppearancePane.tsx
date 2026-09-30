import { BUILT_IN_TEMPLATE_NAMES } from "@cm-clone/shared";
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
import { AVATAR_PALETTE } from "./managerStyleCopy.js";
import { StepHeading } from "./StepHeading.js";

export interface ManagerStyleAppearancePaneProps {
  readonly preferredFormation: string | null;
  readonly avatarPrimaryColor: string;
  readonly avatarSecondaryColor: string;
  readonly onFormationChange: (formation: string) => void;
  readonly onAvatarChange: (primary: string, secondary: string) => void;
}

/**
 * The Manager step's third panel: the manager's tactical identity and appearance. It collects the
 * one required preference — a preferred formation, one of CM 03/04's 29 built-in templates, unset
 * until picked, so the panel is a real step — and the optional avatar accent scheme. The palette is a
 * fixed set of accent pairs, not a colour wheel: contrast is guaranteed by construction and a swatch is a stable test target.
 */
export const ManagerStyleAppearancePane = ({
  preferredFormation,
  avatarPrimaryColor,
  avatarSecondaryColor,
  onFormationChange,
  onAvatarChange,
}: ManagerStyleAppearancePaneProps) => (
  <>
    <div>
      <StepHeading title="Style & Appearance">
        Choose the formation your first Tactic starts from, and how you appear.
      </StepHeading>
    </div>

    <div className="rounded-panel border border-panel-border bg-card p-6 shadow-panel">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <Label className="block">Preferred formation</Label>
          <Select
            value={preferredFormation ?? ""}
            onValueChange={(value) => {
              if (value !== "" && value !== null) onFormationChange(value);
            }}
          >
            <SelectTrigger aria-label="Preferred formation" className="mt-2">
              <SelectValue placeholder="Select a formation" />
            </SelectTrigger>
            <SelectContent>
              {BUILT_IN_TEMPLATE_NAMES.map((formation) => (
                <SelectItem key={formation} value={formation}>
                  {formation}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-data text-text-muted">
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
                    "flex items-center gap-2 rounded-control border px-2 py-1.5 text-data transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-text-primary"
                      : "border-border-subtle bg-field-bg text-text-soft hover:bg-surface-raised",
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
          <p className="mt-2 text-data text-text-muted">
            Your colours and initials stand in for a portrait.
          </p>
        </div>
      </div>
    </div>
  </>
);
