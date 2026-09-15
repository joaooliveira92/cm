import { useEffect, useState } from "react";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { IDLE_PREFIX, type PrefixState } from "../keymap/prefix.js";
import { prefixTimeoutMs } from "../keymap/timeout.js";

export interface PrefixController {
  readonly prefix: PrefixState;
  readonly setPrefix: (next: PrefixState) => void;
}

export const usePrefixState = (): PrefixController => {
  const [prefix, setPrefix] = useState<PrefixState>(IDLE_PREFIX);

  useEffect(() => {
    if (prefix.kind === "idle") return;
    const timer = setTimeout(() => setPrefix(IDLE_PREFIX), prefixTimeoutMs());
    return () => clearTimeout(timer);
  }, [prefix]);

  useEffect(() => {
    switch (prefix.kind) {
      case "idle":
        setScopeState({ prefixActive: false });
        clearScopeState("prefixKind", "deepSectionId");
        break;
      case "level0":
        setScopeState({ prefixActive: true, prefixKind: "level0" });
        clearScopeState("deepSectionId");
        break;
      case "level1":
        setScopeState({
          prefixActive: true,
          prefixKind: "level1",
          deepSectionId: prefix.sectionKey,
        });
        break;
    }
    return () => clearScopeState("prefixActive", "prefixKind", "deepSectionId");
  }, [prefix]);

  return { prefix, setPrefix };
};