import { useState } from "react";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { ALL_ATTRIBUTES, type Attribute } from "@cm-clone/shared";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.js";
import { ATTRIBUTE_MINIMUMS, clauseLabel } from "../table/features/filtering.js";
import { SQUAD_COLUMN_LABELS } from "../table/squad/squadColumns.js";
import type { FilterClause } from "../table/types.js";
import { ACTIONS_ROW_BUTTON_CLASS, ACTIONS_ROW_ITEM_CLASS } from "./actionsRowClasses.js";

type AttributeClause = Extract<FilterClause, { readonly _tag: "attribute" }>;

/** Highest first: a threshold filter is read as "at least", so the strict end leads. */
const MINIMUMS_DESCENDING = [...ATTRIBUTE_MINIMUMS].reverse();

/**
 * The Squad toolbar's attribute threshold (Screen 71, group-e 04): one Attribute, at a minimum on
 * the 1–20 scale. Two steps in one popover — pick the Attribute, then the minimum — because both
 * lists are enumerated, and the Position/Status pattern is a list of enumerated rows (group-e 03).
 * The Attribute list is `ALL_ATTRIBUTES` whatever columns are visible: hiding a column must not
 * silently drop an active filter, and the trigger names the clause either way.
 */
export const AttributeFilterPopover = ({
  active,
  onSet,
  onClear,
}: {
  readonly active: AttributeClause | undefined;
  readonly onSet: (attribute: Attribute, min: number) => void;
  readonly onClear: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Attribute | null>(null);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setPending(null);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <button type="button" className={ACTIONS_ROW_BUTTON_CLASS} aria-label="Filter squad by attribute">
            <span>{active === undefined ? "Attribute" : `Attribute: ${clauseLabel(active)}`}</span>
            <ChevronDown aria-hidden="true" className="size-4" />
          </button>
        }
      />
      <PopoverContent align="start" sideOffset={4} className="max-h-80 w-56 overflow-y-auto p-1">
        {pending === null ? (
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              className={ACTIONS_ROW_ITEM_CLASS}
              onClick={() => {
                onClear();
                onOpenChange(false);
              }}
            >
              <span>Any attribute</span>
            </button>
            {ALL_ATTRIBUTES.map((attribute) => (
              <button
                key={attribute}
                type="button"
                className={ACTIONS_ROW_ITEM_CLASS}
                onClick={() => setPending(attribute)}
              >
                <span>{SQUAD_COLUMN_LABELS[attribute]}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5" role="group" aria-label={`${SQUAD_COLUMN_LABELS[pending]} at least`}>
            <button type="button" className={ACTIONS_ROW_ITEM_CLASS} onClick={() => setPending(null)}>
              <ChevronLeft aria-hidden="true" className="size-4" />
              <span>{SQUAD_COLUMN_LABELS[pending]}: at least</span>
            </button>
            {MINIMUMS_DESCENDING.map((min) => (
              <button
                key={min}
                type="button"
                className={ACTIONS_ROW_ITEM_CLASS}
                onClick={() => {
                  onSet(pending, min);
                  onOpenChange(false);
                }}
              >
                <span>{`${min}+`}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
