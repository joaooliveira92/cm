import { type NationId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const NationOverviewScreen = ({ saveId: _saveId, nationId }: { readonly saveId: SaveId; readonly nationId: NationId }) => (
  <main
    tabIndex={-1}
    data-focus-id="nationOverview"
    aria-label="Nation Overview"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Nation Overview</h1>
    <p className="mt-1 text-sm text-text-mono">Nation {nationId}</p>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);