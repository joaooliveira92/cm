import type { SaveId } from "@cm-clone/contracts";
import { Outlet, useLocation, useParams } from "@tanstack/react-router";
import { type ComponentType, type MouseEvent, useEffect, useRef } from "react";
import type { NavigationIntent } from "../focus.js";
import {
  navigate,
  navigateCareer,
  navigateWithFocus,
} from "../navigation/adapter.js";
import type { CareerDestination } from "../navigation/destinations.js";
import { decodeSaveId } from "../navigation/params.js";
import { RegistryProvider } from "../rpc.js";
import { resetTableSessions } from "../table/tableState.js";
import { RouteView } from "./RouteView.js";

/** Distinct route-structure error, rendered apart from typed RPC failures (AC-12). */
export const RouteParamErrorScreen = ({
  reason,
}: {
  readonly reason: string;
}) => (
  <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
    <h1 className="text-2xl font-bold">Invalid career address</h1>
    <p className="mt-4 text-slate-400">{reason}</p>
  </main>
);

/** The career chrome: the persistent shell every career route shares (AC-11). */
export const CareerChrome = ({ saveId }: { readonly saveId: SaveId }) => {
  const renderCount = useRef(0);
  renderCount.current += 1;
  if (renderCount.current > 5 && renderCount.current % 25 === 0)
    console.log("[debug-chrome] render #", renderCount.current);
  const { pathname } = useLocation();
  const activeChild = pathname.split("/").at(-1) ?? "";
  const tabs: ReadonlyArray<{
    readonly label: string;
    readonly childPath: string;
    readonly destination: CareerDestination["type"];
  }> = [
    { label: "squad", childPath: "squad", destination: "squad" },
    { label: "tactics", childPath: "tactics", destination: "tactics" },
    { label: "transfers", childPath: "transfers", destination: "transfers" },
    { label: "league table", childPath: "league", destination: "league" },
    { label: "fixtures", childPath: "fixtures", destination: "fixtures" },
    { label: "match day", childPath: "match", destination: "match" },
    {
      label: "season summary",
      childPath: "season-summary",
      destination: "seasonSummary",
    },
  ];

  const onTabClick = (
    event: MouseEvent,
    destination: CareerDestination["type"],
  ): void => {
    // event.detail === 0 marks keyboard (Enter/Space) activation of the native
    // button; pointer clicks always report a non-zero detail. Navigation intent
    // decides whether the destination requests semantic focus.
    const intent: NavigationIntent = event.detail > 0 ? "pointer" : "keyboard";
    navigateCareer({ type: destination, saveId }, intent);
  };

  const onBackToSaves = (event: MouseEvent): void => {
    const intent: NavigationIntent = event.detail > 0 ? "pointer" : "keyboard";
    if (intent === "keyboard") {
      navigateWithFocus({ type: "saveList" }, { screen: "saveList" });
    } else {
      navigate({ type: "saveList" });
    }
  };

  return (
    <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-2 text-sm text-slate-100">
      <div className="flex gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.childPath}
            type="button"
            className={`rounded px-3 py-1 capitalize ${
              tab.childPath === activeChild
                ? "bg-slate-100 text-slate-900"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
            onClick={(event) => onTabClick(event, tab.destination)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="rounded bg-slate-800 px-3 py-1 hover:bg-slate-700"
        onClick={onBackToSaves}
      >
        Back to saves
      </button>
    </nav>
  );
};

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
