import type { SaveId } from "@cm-clone/contracts";
import { Outlet, useParams } from "@tanstack/react-router";
import { type ComponentType, useEffect } from "react";
import {
  navigateCareer,
} from "../navigation/adapter.js";
import { decodeSaveId } from "../navigation/params.js";
import { CareerChrome } from "../chrome/CareerChrome.js";
import { RegistryProvider } from "../rpc.js";
import { resetTableSessions } from "../table/tableState.js";
import { RouteView } from "./RouteView.js";

// The chrome moved to `chrome/CareerChrome.tsx` when it grew a title bar, a
// season readout, and the career-loop handler. Re-exported here because the tab
// set is checked against `CAREER_SCREEN_TYPES` from this module's path.
export { CAREER_TABS, CareerChrome, type CareerTab } from "../chrome/CareerChrome.js";

/** Distinct route-structure error, rendered apart from typed RPC failures (AC-12). */
export const RouteParamErrorScreen = ({
  reason,
}: {
  readonly reason: string;
}) => (
  <main className="min-h-screen bg-background p-8 text-foreground">
    <h1 className="text-2xl font-bold">Invalid career address</h1>
    <p className="mt-4 text-text-secondary">{reason}</p>
  </main>
);

/**
 * The career parent route (`/career/$saveId`). Owns the persistent shell and
 * the save-scoped Atom registry, relocated whole from `App.tsx`'s career
 * branch — `key={saveId}` keeps a fresh registry per save, so switching saves
 * can never serve stale atoms from a previous career.
 *
 * Table session state (sort/filters/focus/scroll for the table screens) is
 * module-level in `tableState.ts`, so a NEW save mounting here must clear it
 * BEFORE the child screens' mount initializers seed from it. The guard runs in
 * the render body (a mount effect would run after the children captured the
 * previous save's session) keyed on the save — intra-save screen navigation
 * keeps the session (the note's "Screen navigation survives" row), a save
 * switch and a post-reload remount clear it (the note's "Save reload" row).
 */
let activeCareerSaveKey: string | null = null;

export const CareerShell = () => {
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");
  if (decoded._tag === "Malformed") {
    return <RouteParamErrorScreen reason={decoded.reason} />;
  }
  const saveId = decoded.success;
  const saveKey = String(saveId);
  if (activeCareerSaveKey !== saveKey) {
    activeCareerSaveKey = saveKey;
    resetTableSessions();
  }
  return (
    <RegistryProvider key={saveId}>
      <CareerChrome saveId={saveId} />
      <Outlet />
    </RegistryProvider>
  );
};

interface CareerScreenProps {
  readonly saveId: SaveId;
}

type CareerScreenComponent = ComponentType<CareerScreenProps>;

/** One career child route surface: boundary-decode the `saveId`, then render
 *  the screen inside its semantic RouteView (keyboard/palette arrival focuses
 *  the screen's main region by identity; pointer arrival does not). */
export const CareerChildView = ({
  screenId,
  Screen,
}: {
  readonly screenId: string;
  readonly Screen: CareerScreenComponent;
}) => {
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");
  return decoded._tag === "Success" ? (
    <RouteView screenId={screenId}>
      <Screen saveId={decoded.success} />
    </RouteView>
  ) : (
    <RouteParamErrorScreen reason={decoded.reason} />
  );
};

/** The index of `/career/$saveId`: no child route → redirect to Squad. */
export const CareerIndexRedirect = () => {
  const params = useParams({ strict: false });
  const saveId = params.saveId ?? "";
  const decoded = decodeSaveId(saveId);
  useEffect(() => {
    if (decoded._tag === "Success") {
      navigateCareer({ type: "squad", saveId: decoded.success }, "pointer");
    }
  }, [saveId]);
  return decoded._tag === "Malformed" ? (
    <RouteParamErrorScreen reason={decoded.reason} />
  ) : null;
};
