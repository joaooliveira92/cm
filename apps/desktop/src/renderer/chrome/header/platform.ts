/**
 * Whether the app is running on macOS, which is the only platform whose window
 * chrome the renderer has to make room for: `titleBarStyle: "hiddenInset"`
 * keeps the traffic lights but removes the title bar, so the band reserves
 * their inset instead of drawing underneath them.
 *
 * Read from the preload bridge, with a `navigator` fallback so the band renders
 * in jsdom and in the Vite dev server, where no bridge exists.
 */
const bridgePlatform = (): string | null => {
  const api = (globalThis as { electronAPI?: { platform?: string } }).electronAPI;
  return api?.platform ?? null;
};

export const isMacOS = (): boolean => {
  const platform = bridgePlatform();
  if (platform !== null) return platform === "darwin";
  return /mac/i.test(globalThis.navigator?.userAgent ?? "");
};

/** The left inset that clears the macOS traffic lights, as a class. */
export const trafficLightInset = (): string => (isMacOS() ? "pl-20" : "pl-3");
