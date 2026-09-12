/**
 * The command palette (command-palette note, AC-01/03/04/05/06/07/08/23).
 * Opened with `Primary+K` (dispatched by the keyboard spine), it lists global +
 * current-screen Actions — the registry's live active set for the current
 * scope union — ranked available-above-unavailable then by label match score.
 *
 * It is strictly a command surface: every entry is an Action record, dispatched
 * by id (a navigation entry reads "Go to Squad" and dispatches its Action on
 * Enter, never an instant `navigate`). No game-data search exists by
 * construction — the only rows are registry Actions. Unavailable Actions are
 * disabled-with-reason, never hidden (AC-23).
 *
 * The overlay owns its modal keys through the binding seam (`useSeamHotkeys`):
 * type to filter (native in the combobox), ArrowUp/Down to move the selection,
 * Enter to dispatch, Escape to close.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScreenName, ScopeState } from "../actions/types.js";
import { ALL_ACTIONS } from "../actions/allActions.js";
import { actionsInTiers } from "../actions/registry.js";
import { withEffectiveBindings, type KeyBindingOverrides } from "../actions/overrides.js";
import { dispatchActionWithParams } from "../actions/dispatch.js";
import { Badge } from "../components/ui/badge.js";
import { Kbd } from "../components/ui/kbd.js";
import { FOCUS_RING } from "../focus.js";
import { useSeamHotkeys } from "../hotkeys.js";
import { rankPaletteActions, type PaletteCandidate } from "./rank.js";

export const CommandPalette = ({
  screen,
  state,
  overrides,
  onClose,
}: {
  readonly screen: ScreenName;
  readonly state: ScopeState;
  /** The current override map — the row badges show *effective* bindings (Stage 6). */
  readonly overrides: KeyBindingOverrides;
  readonly onClose: () => void;
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // The rows are the live registry set for the current scope union (globals +
  // career-globals + current-screen), ranked. Availability is a per-row read of
  // the live ScopeState — the same truth the spine's dispatcher honours. The
  // tier slice and the ranking are memoised so typing never re-walks the whole
  // registry (note's palette-latency mitigation; n < 50 anyway). Overrides are
  // layered over the slice, so the binding badges always show the *effective*
  // binding — never a value the key map no longer serves.
  const rankInput = useMemo(
    () => withEffectiveBindings(actionsInTiers(ALL_ACTIONS, screen), overrides),
    [screen, overrides],
  );
  const ranked: ReadonlyArray<PaletteCandidate> = useMemo(
    () => rankPaletteActions(rankInput, query, state),
    [rankInput, query, state],
  );

  // Focus the combobox on open (focus model: the palette is given focus).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the selection on the list as the query narrows it.
  useEffect(() => {
    setSelectedIndex((prev) => Math.max(0, Math.min(prev, Math.max(0, ranked.length - 1))));
  }, [ranked.length, query]);

  const moveSelection = useCallback(
    (delta: number) => {
      setSelectedIndex((prev) => {
        const max = Math.max(0, ranked.length - 1);
        return Math.max(0, Math.min(max, prev + delta));
      });
    },
    [ranked.length],
  );

  const confirm = useCallback(() => {
    const entry = ranked[selectedIndex];
    if (entry === undefined || !entry.available) return;
    // Close the palette first so a layer-opening Action (open-help, open-palette)
    // dispatched below is the layer that ends up open, not the none this close
    // would otherwise settle last in the same batch.
    onClose();
    dispatchActionWithParams(entry.action);
  }, [ranked, selectedIndex, onClose]);

  useSeamHotkeys(
    "Escape",
    (event) => {
      event.preventDefault();
      onClose();
    },
    { enableOnFormTags: true },
    [onClose],
  );
  useSeamHotkeys(
    "ArrowDown",
    (event) => {
      event.preventDefault();
      moveSelection(1);
    },
    { enableOnFormTags: true },
    [moveSelection],
  );
  useSeamHotkeys(
    "ArrowUp",
    (event) => {
      event.preventDefault();
      moveSelection(-1);
    },
    { enableOnFormTags: true },
    [moveSelection],
  );
  useSeamHotkeys(
    "Enter",
    (event) => {
      event.preventDefault();
      confirm();
    },
    { enableOnFormTags: true },
    [confirm],
  );

  const optionIdOf = (index: number): string => `palette-option-${index}`;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center bg-black/60 pt-20"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="flex max-h-[60vh] w-[32rem] max-w-[90vw] flex-col overflow-hidden rounded-panel border border-panel-border bg-panel-bg-strong shadow-2xl"
      >
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-options"
          aria-autocomplete="list"
          aria-activedescendant={ranked.length > 0 ? optionIdOf(selectedIndex) : undefined}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a command…"
          className={`border-b border-border-subtle bg-transparent px-4 py-3 text-base text-text-primary placeholder:text-text-muted focus:outline-none ${FOCUS_RING.join(" ")}`}
        />
        <div id="palette-options" role="listbox" className="flex-1 overflow-y-auto">
          {ranked.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No matching commands</p>
          ) : (
            ranked.map((entry, index) => {
              const { action, available, reason } = entry;
              const selected = index === selectedIndex;
              return (
                <div
                  key={action.id}
                  id={optionIdOf(index)}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={!available}
                  data-action-id={action.id}
                  className={`flex items-center justify-between gap-3 px-4 py-2 text-sm ${
                    selected ? "bg-surface" : ""
                  } ${available ? "text-text-primary" : "text-text-muted"}`}
                  onMouseDown={() => {
                    if (available) {
                      onClose();
                      dispatchActionWithParams(action);
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="truncate">
                    {action.scope !== "app-global" && action.scope !== "career-global" && (
                      <Badge variant="secondary" className="mr-2">
                        {action.scope}
                      </Badge>
                    )}
                    {action.label}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {!available && reason !== null && (
                      <span className="max-w-[14rem] truncate text-xs text-destructive">{reason}</span>
                    )}
                    {action.binding !== undefined && (
                      <Kbd>{action.binding}</Kbd>
                    )}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};