import type { ReactNode } from "react";

type Listener = () => void;

let version = 0;
let controls: ReactNode = null;
const listeners = new Set<Listener>();

export const getToolbarVersion = (): number => version;

export const subscribeToolbarVersion = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getToolbarControls = (): ReactNode => controls;

export const setToolbarControls = (node: ReactNode): void => {
  controls = node;
  version++;
  for (const listener of listeners) listener();
};

export const clearToolbarControls = (): void => {
  controls = null;
  version++;
  for (const listener of listeners) listener();
};