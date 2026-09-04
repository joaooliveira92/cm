import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown, CircleHelp } from "lucide-react";
import { useCallback, useId, useState } from "react";
import type { AdvancedOptionsPayload } from "@cm-clone/contracts";
import type { AdvancedOptionsKey } from "@cm-clone/shared";
import { Separator } from "../components/ui/separator.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import { OPTION_ROW_HEIGHT } from "./density.js";

/**
 * The advanced-options disclosure — the uncommon settings, below a full-width separator and
 * collapsed by default so the primary configuration stays uncluttered.
 *
 * Every option here changes something real (the ticket-03 model: match-simulation detail,
 * transfer-market activity, roster-generation detail, information visibility). Three of the four
 * feed the processing-cost and entity estimates the sidebar reads; the fourth feeds a real
 * information policy. No checkbox lies to the player, and staff generation and editor capability
 * are absent rather than rendered dead, because no such system ships in v1.
 *
 * **Divergence from the brief, deliberately.** The brief's advanced section is a checklist of
 * booleans and the spec inherited that phrasing ("Base UI checkbox primitives"). The shipped
 * option model is *enumerated*, not boolean — match-simulation detail alone has three values —
 * so a checkbox could only be honest by fabricating a boolean the domain does not have. Each
 * option therefore renders as a labelled native select, the same keyboard-complete control the
 * league grid's depth cell already uses in this screen. The two-column grid, the 28–32px rows,
 * the labelled groups, and the independently keyboard-reachable help controls are all as
 * specified.
 *
 * Help is *inline text*, not a tooltip: the accessibility contract says tooltips are never the
 * only home of anything essential, so the help control toggles a paragraph that a screen reader
 * and a keyboard user reach the same way a pointer user does — and reaching it never changes the
 * setting it explains.
 *
 * Presentational: it renders the option values it is given and emits a `changeAdvancedOption`
 * through `onChange`. It holds no configuration state and never touches IPC.
 */

interface OptionValue {
  readonly value: string;
  readonly label: string;
}

interface OptionDescriptor {
  readonly key: AdvancedOptionsKey;
  readonly label: string;
  readonly help: string;
  readonly values: readonly OptionValue[];
}

interface OptionGroup {
  readonly id: string;
  readonly label: string;
  readonly options: readonly OptionDescriptor[];
}

/**
 * The labelled groups. The spec asks the section to split into groups "once the list outgrows a
 * plain checklist"; four options across two distinct concerns is already past that, so the split
 * ships now rather than waiting for a fifth option to make the wall.
 */
export const ADVANCED_OPTION_GROUPS: readonly OptionGroup[] = [
  {
    id: "simulation",
    label: "Simulation",
    options: [
      {
        key: "matchSimulationDetail",
        label: "Match simulation detail",
        help: "How much of each match the engine resolves. More detail means more per-minute event work, so this raises the estimated processing interval.",
        values: [
          { value: "full", label: "Full" },
          { value: "standard", label: "Standard" },
          { value: "quick", label: "Quick" },
        ],
      },
      {
        key: "transferMarketActivity",
        label: "Transfer market activity",
        help: "How much movement the AI clubs generate between windows. A busier market raises the estimated processing interval.",
        values: [
          { value: "active", label: "Active" },
          { value: "standard", label: "Standard" },
          { value: "quiet", label: "Quiet" },
        ],
      },
    ],
  },
  {
    id: "world",
    label: "World and information",
    options: [
      {
        key: "rosterGenerationDetail",
        label: "Roster generation detail",
        help: "How deep a squad each loaded club is generated with. A fuller squad raises the estimated entity count, and through it the processing interval.",
        values: [
          { value: "full", label: "Full squads" },
          { value: "standard", label: "Standard" },
          { value: "first_team", label: "First team only" },
        ],
      },
      {
        key: "informationVisibility",
        label: "Information visibility",
        help: "Whether player attributes read as exact figures or as the scouting-gated range. This sets the game's information policy; it does not change the estimate.",
        values: [
          { value: "exact", label: "Exact figures" },
          { value: "ranged", label: "Scouted ranges" },
        ],
      },
    ],
  },
];

export interface AdvancedOptionsProps {
  readonly options: AdvancedOptionsPayload;
  readonly onChange: (key: AdvancedOptionsKey, value: string) => void;
  /** Blocking messages the option combination produced — rendered beside the section so an
   *  incompatibility is visible where it was caused, not only in the sidebar. */
  readonly issues?: readonly string[];
  /** Collapsed by default, per the spec; a test or a restored draft may open it. */
  readonly defaultOpen?: boolean;
}

export const AdvancedOptions = ({
  options,
  onChange,
  issues = [],
  defaultOpen = false,
}: AdvancedOptionsProps) => {
  const panelId = useId();
  return (
  <section aria-label="Advanced options" className="shrink-0">
    <Separator className="bg-panel-border" />
    <Collapsible.Root defaultOpen={defaultOpen}>
      <Collapsible.Trigger
        aria-controls={panelId}
        className={`group flex h-7 w-full items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary ${FOCUS_RING.join(" ")}`}
      >
        <ChevronDown
          aria-hidden="true"
          className="size-3.5 transition-transform group-data-[open]:rotate-180 motion-reduce:transition-none"
        />
        Advanced options
      </Collapsible.Trigger>
      {/* `keepMounted` so the panel the trigger names through `aria-controls` exists whether or
          not it is open: a disclosure whose control points at nothing while collapsed is a
          dangling reference, and the accessibility contract asks for `aria-expanded` *and*
          `aria-controls`. Closed, Base UI hides it from the accessibility tree. */}
      <Collapsible.Panel id={panelId} keepMounted className="pb-1">
        <div className="flex flex-col gap-2 pt-1">
          {ADVANCED_OPTION_GROUPS.map((group) => (
            <OptionGroupFieldset
              key={group.id}
              group={group}
              options={options}
              onChange={onChange}
            />
          ))}
          {issues.length === 0 ? null : (
            <ul className="flex flex-col gap-0.5 text-2xs text-destructive">
              {issues.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  </section>
  );
};

/** One labelled group. A `fieldset`/`legend` pair carries the grouping semantically, so the
 *  label is not merely a heading floating above a two-column grid. */
const OptionGroupFieldset = ({
  group,
  options,
  onChange,
}: {
  readonly group: OptionGroup;
  readonly options: AdvancedOptionsPayload;
  readonly onChange: (key: AdvancedOptionsKey, value: string) => void;
}) => (
  <fieldset className="min-w-0">
    <legend className="text-2xs font-semibold uppercase tracking-wider text-text-muted">
      {group.label}
    </legend>
    <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-[3px]">
      {group.options.map((option) => (
        <AdvancedOptionRow
          key={option.key}
          option={option}
          value={(options as unknown as Record<string, string>)[option.key] ?? ""}
          onChange={onChange}
        />
      ))}
    </div>
  </fieldset>
);

/** One option row: label, select, and a help control that is a separate tab stop from the
 *  select, so a player can read what a setting means without changing it. */
const AdvancedOptionRow = ({
  option,
  value,
  onChange,
}: {
  readonly option: OptionDescriptor;
  readonly value: string;
  readonly onChange: (key: AdvancedOptionsKey, value: string) => void;
}) => {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();
  const toggleHelp = useCallback(() => {
    setHelpOpen((open) => !open);
  }, []);

  return (
    <div className="min-w-0">
      <div className={`flex items-center gap-2 ${OPTION_ROW_HEIGHT}`}>
        <label className="min-w-0 flex-1 truncate text-xs text-text-body" htmlFor={`${helpId}-control`}>
          {option.label}
        </label>
        <button
          type="button"
          aria-label={`About ${option.label}`}
          aria-expanded={helpOpen}
          aria-controls={helpId}
          onClick={toggleHelp}
          className={`flex size-[30px] shrink-0 items-center justify-center rounded-control text-text-muted hover:text-text-primary ${FOCUS_RING.join(" ")}`}
        >
          <CircleHelp aria-hidden="true" className="size-3.5" />
        </button>
        <Select
          value={value}
          onValueChange={(next) => {
            if (next !== null) onChange(option.key, next);
          }}
        >
          <SelectTrigger id={`${helpId}-control`} className="h-6 w-[8rem] px-1 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {option.values.map((entry) => (
              <SelectItem key={entry.value} value={entry.value}>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Always rendered, hidden when closed: `aria-controls` on the help button must resolve
          to a real element whether or not the paragraph is showing. */}
      <p id={helpId} hidden={!helpOpen} className="pb-1 text-2xs text-text-muted">
        {option.help}
      </p>
    </div>
  );
};
