import { useEffect, useMemo, useRef, useState } from "react";
import { BUILT_IN_TEMPLATE_NAMES } from "@cm-clone/shared";
import { dispatchAction } from "../actions/dispatch.js";
import { CM_BUTTON_CLASS } from "./cmChrome.js";
import type { ColumnVisibility, Mode } from "./tacticsTypes.js";

/** A CM-style dropdown menu: a button that opens a list of actions in a floating panel. */
const MenuButton = ({
  label,
  items,
}: {
  readonly label: string;
  readonly items: ReadonlyArray<{
    readonly label: string;
    readonly onSelect: () => void;
    readonly current?: boolean;
    readonly disabled?: boolean;
  }>;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={CM_BUTTON_CLASS}
      >
        {label} <span aria-hidden="true">▼</span>
      </button>
      {open && (
        <ul
          role="menu"
          className="absolute z-40 mt-1 max-h-80 min-w-56 overflow-auto rounded-panel border border-border bg-popover py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                className={`w-full px-3 py-1 text-left text-body transition-colors hover:bg-white/10 ${
                  item.current ? "text-text-highlight font-semibold" : "text-foreground"
                } ${item.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/** The formation menu bar: quick-load templates, column toggles, the template label and the
 *  positions/instructions/priorities mode switch. */
export const TacticsMenuBar = ({
  isInMatch,
  sourceTemplate,
  modified,
  columns,
  onToggleColumn,
  mode,
  onSelectMode,
}: {
  readonly isInMatch: boolean;
  readonly sourceTemplate: string;
  readonly modified: boolean;
  readonly columns: ColumnVisibility;
  readonly onToggleColumn: (column: keyof ColumnVisibility) => void;
  readonly mode: Mode;
  readonly onSelectMode: (mode: Mode) => void;
}) => {
  const templateItems = useMemo(
    () =>
      BUILT_IN_TEMPLATE_NAMES.map((name) => ({
        label: `${name === sourceTemplate ? "✓ " : ""}Quick Load: ${name}`,
        onSelect: () => void dispatchAction("set-formation", { formation: name }),
        current: name === sourceTemplate,
      })),
    [sourceTemplate],
  );

  return (
    <nav aria-label="Tactics menu" className="flex shrink-0 items-center gap-2 pb-2">
      <MenuButton
        label="File"
        items={
          isInMatch
            ? templateItems
            : [...templateItems, { label: "Save", onSelect: () => void dispatchAction("save-tactic") }]
        }
      />
      <MenuButton
        label="View"
        items={[
          {
            label: `${columns.pos ? "Hide" : "Show"} Position`,
            onSelect: () => onToggleColumn("pos"),
            current: columns.pos,
          },
          {
            label: `${columns.fit ? "Hide" : "Show"} Fit`,
            onSelect: () => onToggleColumn("fit"),
            current: columns.fit,
          },
          {
            label: `${columns.condition ? "Hide" : "Show"} Condition`,
            onSelect: () => onToggleColumn("condition"),
            current: columns.condition,
          },
        ]}
      />
      <span
        data-testid="tactic-template-label"
        className="ml-2 text-label font-semibold text-text-bright [text-shadow:0_1px_2px_rgb(0_0_0/0.8)]"
      >
        {sourceTemplate}
        {modified ? " (modified)" : ""}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-pressed={mode === "positions"}
          onClick={() => onSelectMode("positions")}
          className={CM_BUTTON_CLASS}
        >
          Set Positions
        </button>
        <button
          type="button"
          aria-pressed={mode === "instructions"}
          onClick={() => onSelectMode("instructions")}
          className={CM_BUTTON_CLASS}
        >
          Set Instructions
        </button>
        <button
          type="button"
          aria-pressed={mode === "priorities"}
          onClick={() => onSelectMode("priorities")}
          className={CM_BUTTON_CLASS}
        >
          Set Priorities
        </button>
      </div>
    </nav>
  );
};
