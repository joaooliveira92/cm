import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { CATEGORIES, CATEGORY_ATTRIBUTES, type Attribute, type Category } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog.js";
import { cn } from "../lib/utils.js";
import { ATTRIBUTE_MINIMUMS, clauseLabel, type AttributeThreshold } from "../table/features/filtering.js";
import { SQUAD_COLUMN_LABELS } from "../table/squad/squadColumns.js";
import type { FilterClause } from "../table/types.js";
import { ACTIONS_ROW_BUTTON_CLASS } from "./actionsRowClasses.js";

type AttributeClause = Extract<FilterClause, { readonly _tag: "attribute" }>;

const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  technical: "Technical",
  mental: "Mental",
  physical: "Physical",
  goalkeeping: "Goalkeeping",
};

/** Category order, then each Category's own order: the order the draft applies in, so the URL
 *  and the trigger read the same way however the thresholds were picked. */
const DIALOG_ORDER: readonly Attribute[] = CATEGORIES.flatMap((category) => CATEGORY_ATTRIBUTES[category]);

/** The pressed state of a choice in either grid: the chosen one reads in the theme color. */
const choiceClass = (pressed: boolean) =>
  cn(pressed && "bg-primary text-primary-foreground hover:bg-primary/90");

const triggerText = (active: readonly AttributeClause[]): string => {
  const [first, ...rest] = active;
  if (first === undefined) return "Attribute";
  if (rest.length === 0) return `Attribute: ${clauseLabel(first)}`;
  return `Attributes: ${clauseLabel(first)} +${rest.length}`;
};

const thresholdsOf = (draft: ReadonlyMap<Attribute, number>): readonly AttributeThreshold[] =>
  DIALOG_ORDER.flatMap((attribute) => {
    const min = draft.get(attribute);
    return min === undefined ? [] : [{ attribute, min }];
  });

/**
 * The Squad toolbar's attribute thresholds (Screen 71, group-e 04 and 05): any number of
 * Attributes, each at a minimum on the 1–20 scale, all of which a player must meet. A modal, so
 * every Attribute is on view at once, grouped by Category the way the profile reads them.
 * Pick an Attribute, then its minimum; "Any" drops it. The thresholds are a draft until Apply, so
 * browsing never refilters the table under the dialog, and the live count says what Apply would
 * leave. The list is every Category's whatever columns are visible: hiding a column must not
 * silently drop an active filter, and the trigger names the thresholds either way.
 */
export const AttributeFilterDialog = ({
  active,
  onApply,
  countMatching,
}: {
  readonly active: readonly AttributeClause[];
  readonly onApply: (thresholds: readonly AttributeThreshold[]) => void;
  readonly countMatching: (thresholds: readonly AttributeThreshold[]) => number;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ReadonlyMap<Attribute, number>>(new Map());
  const [focused, setFocused] = useState<Attribute | null>(null);

  const onOpenChange = (next: boolean) => {
    // Each opening starts from the live thresholds, not from an abandoned draft.
    if (next) {
      setDraft(new Map(active.map((clause) => [clause.attribute, clause.min])));
      setFocused(active[0]?.attribute ?? null);
    }
    setOpen(next);
  };

  const setMin = (min: number | undefined) => {
    if (focused === null) return;
    const next = new Map(draft);
    if (min === undefined) next.delete(focused);
    else next.set(focused, min);
    setDraft(next);
  };

  const finish = (thresholds: readonly AttributeThreshold[]) => {
    onApply(thresholds);
    setOpen(false);
  };

  const thresholds = thresholdsOf(draft);
  const count = open ? countMatching(thresholds) : 0;
  const focusedMin = focused === null ? undefined : draft.get(focused);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={ACTIONS_ROW_BUTTON_CLASS}
            aria-label="Filter squad by attribute"
            title={active.length > 1 ? active.map(clauseLabel).join(", ") : undefined}
          >
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            <span>{triggerText(active)}</span>
          </button>
        }
      />
      <DialogContent className="max-w-3xl p-4">
        <DialogTitle className="text-text-primary">Filter by attribute</DialogTitle>
        <DialogDescription className="text-text-secondary">
          Show only players whose exact figures meet every minimum you set. Pick an attribute, then
          its minimum.
        </DialogDescription>

        <div className="grid grid-cols-4 gap-3">
          {CATEGORIES.map((category) => (
            <div key={category} role="group" aria-label={CATEGORY_LABELS[category]} className="flex flex-col gap-1">
              <span className="text-label text-text-secondary">{CATEGORY_LABELS[category]}</span>
              {CATEGORY_ATTRIBUTES[category].map((key) => {
                const min = draft.get(key);
                return (
                  <Button
                    key={key}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={min === undefined ? SQUAD_COLUMN_LABELS[key] : `${SQUAD_COLUMN_LABELS[key]} ${min}+`}
                    aria-pressed={focused === key}
                    className={cn("justify-between", choiceClass(focused === key))}
                    onClick={() => setFocused(key)}
                  >
                    <span>{SQUAD_COLUMN_LABELS[key]}</span>
                    {min !== undefined && <span className="tabular-nums">{`${min}+`}</span>}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>

        <div role="group" aria-label="At least" className="flex flex-col gap-1">
          <span className="text-label text-text-secondary">
            {focused === null ? "Pick an attribute to set its minimum" : `${SQUAD_COLUMN_LABELS[focused]}: at least`}
          </span>
          <div className="grid grid-cols-7 gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={focused === null}
              aria-pressed={focused !== null && focusedMin === undefined}
              className={choiceClass(focused !== null && focusedMin === undefined)}
              onClick={() => setMin(undefined)}
            >
              Any
            </Button>
            {ATTRIBUTE_MINIMUMS.map((value) => (
              <Button
                key={value}
                type="button"
                variant="outline"
                size="sm"
                disabled={focused === null}
                aria-pressed={focusedMin === value}
                className={choiceClass(focusedMin === value)}
                onClick={() => setMin(value)}
              >
                {`${value}+`}
              </Button>
            ))}
          </div>
        </div>

        <DialogFooter className="items-center gap-2">
          <p role="status" className="mr-auto text-label text-text-secondary">
            {`${count} ${count === 1 ? "player matches" : "players match"}`}
          </p>
          <Button type="button" variant="ghost" disabled={active.length === 0} onClick={() => finish([])}>
            Clear all
          </Button>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => finish(thresholds)}>
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
