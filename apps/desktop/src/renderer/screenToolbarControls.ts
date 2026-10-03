import type { ReactNode } from "react";

type Listener = () => void;

let version = 0;
let controls: ReactNode = null;
let trailing: ReactNode = null;
const listeners = new Set<Listener>();

export const getToolbarVersion = (): number => version;

export const subscribeToolbarVersion = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToolbarControls = (): ReactNode => controls;

/** The screen's right-aligned readout in the same band (e.g. the Squad's player count). */
export const getToolbarTrailing = (): ReactNode => trailing;

export const setToolbarControls = (node: ReactNode, trailingNode: ReactNode = null): void => {
  controls = node;
  trailing = trailingNode;
  version++;
  for (const listener of listeners) listener();
};

export const clearToolbarControls = (): void => {
  controls = null;
  trailing = null;
  version++;
  for (const listener of listeners) listener();
};
