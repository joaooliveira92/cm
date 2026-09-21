import { useSyncExternalStore } from "react";
import {
  getToolbarControls,
  getToolbarVersion,
  subscribeToolbarVersion,
} from "../screenToolbarControls.js";

/** Renders screen-specific toolbar controls (e.g. View/Position selects) in the
 *  actions band between the context nav and the secondary nav tabs. */
export const ScreenToolbarSlot = () => {
  useSyncExternalStore(subscribeToolbarVersion, getToolbarVersion, getToolbarVersion);
  return getToolbarControls();
};
