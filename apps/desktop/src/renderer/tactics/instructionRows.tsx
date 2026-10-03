/**
 * The rows and panels Set Instructions is built from, in CM 03/04's look: a tick box enabling a
 * dropdown, an on/off tick with its yellow hint, and the titled panel
 * they sit in.
 */
import { useId, type ReactNode } from "react";
import {
  CM_HINT_CLASS,
  CM_PANEL_CLASS,
  CM_PANEL_TITLE_CLASS,
  CM_SELECT_CLASS,
} from "./cmChrome.js";
import { Checkbox } from "../components/ui/checkbox.js";

/** camelCase id to Title Case with spaces, eg "closingDown" → "Closing Down". */
export const displayName = (key: string): string =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

/** The few value ids whose Title Case reading is wrong, as CM spells them. */
const VALUE_LABELS: Record<string, string> = {
  edgeOfArea: "Edge of Area",
  edgeOfSixYardBox: "Edge of Six Yard Box",
  aimForBestHeader: "Aim for Best Header",
  attackBallFromEdgeOfArea: "Attack Ball from Edge of Area",
};

export const displayValue = (value: string): string => VALUE_LABELS[value] ?? displayName(value);

/** Tick box, label, control: one grid for every row so the dropdowns line up down the panel. */
const ROW_CLASS = "grid grid-cols-[1rem_12rem_minmax(0,15rem)] items-center gap-x-2 px-3 py-[3px] min-h-7";
const LABEL_CLASS = "cursor-pointer text-label font-semibold text-text-bright";

/**
 * CM's instruction row: a tick box enabling a dropdown. `offValue` is the unticked value, and the
 * disabled dropdown shows `placeholder`, which is what applies instead. Ticking picks the first
 * other value.
 */
export const TickChoiceRow = ({
  label,
  tickHint,
  values,
  offValue,
  placeholder,
  currentValue,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly tickHint: string;
  readonly values: ReadonlyArray<string>;
  readonly offValue: string;
  readonly placeholder: string;
  readonly currentValue: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean | undefined;
}) => {
  const id = useId();
  const isTicked = currentValue !== offValue;
  const options = values.filter((v) => v !== offValue);

  return (
    <div className={ROW_CLASS}>
      <Checkbox
        id={id}
        checked={isTicked}
        onCheckedChange={() => onChange(isTicked ? offValue : options[0]!)}
        aria-label={tickHint}
        disabled={disabled}
      />
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className={`${CM_SELECT_CLASS} w-full`}
        disabled={!isTicked || disabled}
        aria-label={label}
      >
        {isTicked ? (
          options.map((v) => (
            <option key={v} value={v}>
              {displayValue(v)}
            </option>
          ))
        ) : (
          <option value={offValue}>{placeholder}</option>
        )}
      </select>
    </div>
  );
};

/** An on/off row: a tick box whose yellow hint line, bracketed as CM printed it, shows while ticked. */
export const TickFlagRow = ({
  label,
  tickHint,
  hint,
  enabled,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly tickHint: string;
  readonly hint: string;
  readonly enabled: boolean;
  readonly onChange: (enabled: boolean) => void;
  readonly disabled?: boolean | undefined;
}) => {
  const id = useId();
  return (
    <div className={ROW_CLASS}>
      <Checkbox
        id={id}
        checked={enabled}
        onCheckedChange={(checked) => onChange(checked)}
        aria-label={tickHint}
        disabled={disabled}
      />
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {enabled ? (
        <span className={`${CM_HINT_CLASS} before:content-['('] after:content-[')']`}>{hint}</span>
      ) : (
        <span />
      )}
    </div>
  );
};

/** A run of rows, ruled off from the next as CM's list ran on without headings. The name is for
 *  assistive technology only. */
export const RowGroup = ({ name, children }: { readonly name: string; readonly children: ReactNode }) => (
  <div role="group" aria-label={name} className="border-t border-white/10 py-1 first:border-t-0">
    {children}
  </div>
);

/** A CM panel: yellow title on the left, controls on the right, then its rows. */
export const Panel = ({
  label,
  title,
  controls,
  footer,
  className,
  children,
}: {
  readonly label: string;
  readonly title: ReactNode;
  readonly controls?: ReactNode;
  readonly footer?: ReactNode;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <section aria-label={label} className={`${CM_PANEL_CLASS} ${className ?? ""}`}>
    <div className="flex shrink-0 flex-wrap items-center gap-2 pr-2">
      <h2 className={`${CM_PANEL_TITLE_CLASS} flex items-center`}>{title}</h2>
      {controls !== undefined && <div className="ml-auto flex items-center gap-1">{controls}</div>}
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    {footer !== undefined && (
      <div className="flex shrink-0 justify-end border-t border-white/10 px-3 py-1.5">{footer}</div>
    )}
  </section>
);

