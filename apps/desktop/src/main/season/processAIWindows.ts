import { withinMidSeasonWindow, type SeasonWindows } from "@cm-clone/shared";
import { runAiTransferWindow as runAiWindow } from "../club/aiClubs.js";
import { type SeasonRow } from "./currentSeason.js";

export const processAiTransferWindow = runAiWindow;

export const computeWindowClose = (
  row: SeasonRow,
  boundaryDate: string,
  windows: SeasonWindows,
): "pre_season" | "mid_season" | null => {
  if (row.phase === "pre_season") return "pre_season";
  if (row.phase === "mid_window_open" && !withinMidSeasonWindow(windows, boundaryDate)) return "mid_season";
  return null;
};