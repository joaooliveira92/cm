import { useSyncExternalStore } from "react";
import {
  getToolbarControls,
  getToolbarTrailing,
  getToolbarVersion,
  subscribeToolbarVersion,
} from "../screenToolbarControls.js";

/** Renders screen-specific toolbar controls (e.g. View/Position selects) in the
 *  actions band between the context nav and the secondary nav tabs. */
export const ScreenToolbarSlot = () => {
  useSyncExternalStore(subscribeToolbarVersion, getToolbarVersion, getToolbarVersion);
  return getToolbarControls();
};

/** Renders the screen's readout at the right end of the same band. */
export const ScreenToolbarTrailingSlot = () => {
  useSyncExternalStore(subscribeToolbarVersion, getToolbarVersion, getToolbarVersion);
  return getToolbarTrailing();
};
