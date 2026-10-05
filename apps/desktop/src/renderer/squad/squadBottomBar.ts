/**
 * What the Squad screen says in the shell's bottom bar: the match-day lineup's
 * save state, and the last toolbar command's notice. Both used to have lines of
 * their own, the save state under the match-day bar's slots; now they share the
 * bar's one reason line, which is where every other screen reports saving.
 *
 * A conflict outranks everything, because it is the one state that needs the
 * manager to act, and it brings a Refresh button with it. Otherwise the line
 * shows whichever of the two changed last, so a view change is acknowledged
 * even while the lineup is still short of starters, and the next drop's
 * "Saved." replaces that acknowledgement.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Tactic } from "@cm-clone/contracts";
import { useScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import type { ScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import { missingStartersOf } from "./lineupEdits.js";

export const LINEUP_CONFLICT_MESSAGE =
  "A newer tactic was saved since you opened this squad. Your lineup changes are kept — refresh to load the current version.";

export interface LineupSaveInput {
  readonly conflicted: boolean;
  readonly tactic: Tactic;
  readonly status: string | null;
}

/** The lineup's save state as one line, or null when there is nothing to say. */
export const lineupSaveLine = ({ conflicted, tactic, status }: LineupSaveInput): string | null => {
  if (conflicted) return LINEUP_CONFLICT_MESSAGE;
  // The server refuses a lineup with an empty starter slot, so say what saving waits on
  // rather than failing every drop while the lineup is being built.
  const missing = missingStartersOf(tactic);
  if (missing > 0) return `Not saved yet: pick ${missing} more ${missing === 1 ? "starter" : "starters"}.`;
  return status;
};

export const useSquadBottomBar = (
  barNotice: string | null,
  lineup: LineupSaveInput & { readonly refresh: () => void },
): void => {
  const saveLine = lineupSaveLine(lineup);
  const [latest, setLatest] = useState<"lineup" | "notice">("lineup");
  // "Whichever changed last" is stored information about previous renders, adjusted during render
  // against the previous pair rather than in an effect, so the acknowledgement lands in the same
  // commit that produced the change. The two blocks mirror the two former effects exactly: each
  // re-ran on every change of its value (including to and from null) and set the flag only when the
  // new value was non-null, with the save line running second and so winning a tie.
  const [previous, setPrevious] = useState({ barNotice, saveLine });
  const noticeChanged = previous.barNotice !== barNotice;
  const saveLineChanged = previous.saveLine !== saveLine;
  if (noticeChanged || saveLineChanged) {
    setPrevious({ barNotice, saveLine });
    if (noticeChanged && barNotice !== null) setLatest("notice");
    if (saveLineChanged && saveLine !== null) setLatest("lineup");
  }

  // Read through a ref: a caller's `refresh` need not be stable, and a new
  // function each render would re-publish the bar each render. Written after commit, so no ref is
  // touched during render.
  const refresh = useRef(lineup.refresh);
  useEffect(() => {
    refresh.current = lineup.refresh;
  }, [lineup.refresh]);

  const { conflicted } = lineup;
  const bar = useMemo((): ScreenBottomBarActions => {
    if (conflicted) {
      return {
        buttons: [
          { id: "refresh-lineup", label: "Refresh", disabled: false, onTrigger: () => refresh.current() },
        ],
        reason: LINEUP_CONFLICT_MESSAGE,
      };
    }
    const reason = latest === "notice" ? (barNotice ?? saveLine) : (saveLine ?? barNotice);
    return { buttons: [], reason };
  }, [conflicted, latest, barNotice, saveLine]);
  useScreenBottomBarActions(bar);
};
