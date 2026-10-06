import { useCallback, useEffect, useState } from "react";
import { WorldMapChart } from "../components/world-map/WorldMapChart.js";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet.js";
import {
  EMPTY_LIVE_OVERLAY,
  joinWorldMap,
  type LiveWorldMapOverlay,
} from "../screens/map-prototype/campaign-map-join.js";
import {
  initialMapPrototypeState,
  pushRuler,
  readRoute,
  selectArea,
  toggleLayer,
  type LayerId,
} from "../screens/map-prototype/map-prototype-screen-state.js";
import type { ProjectionId } from "../screens/map-prototype/prototype-projection.js";
import type { AreaId } from "../screens/map-prototype/prototype-world.js";
import { useCampaignShellContext } from "./CampaignShellContext.js";

/** Global F1 shortcut that opens the world map in a side sheet. */
export function MapSheet() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(initialMapPrototypeState);
  const [overlay, setOverlay] = useState<LiveWorldMapOverlay>(EMPTY_LIVE_OVERLAY);
  const { state: shell } = useCampaignShellContext();
  const sessionId = shell.mode.kind === "campaign" ? shell.mode.campaign.sessionId : null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== "F1") return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setOpen((isOpen) => !isOpen);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pull the live world whenever a campaign is (or becomes) active; fall back
  // to the static fixture when there is no session so the sheet still renders.
  useEffect(() => {
    const bridge = window.bluewave;
    if (bridge === undefined || sessionId === null) {
      setOverlay(EMPTY_LIVE_OVERLAY);
      return;
    }
    let active = true;
    bridge.campaign
      .execute("inspectMap", sessionId)
      .then((result) => {
        if (!active) return;
        setOverlay(
          result.outcome === "success" ? joinWorldMap(result.value.world) : EMPTY_LIVE_OVERLAY,
        );
      })
      .catch(() => {
        if (active) setOverlay(EMPTY_LIVE_OVERLAY);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  const onSelect = useCallback(
    (area: AreaId | null) => setState((current) => selectArea(current, area)),
    [],
  );
  const onRuler = useCallback(
    (area: AreaId) => setState((current) => pushRuler(current, area)),
    [],
  );
  const onToggleLayer = useCallback(
    (layer: LayerId) => setState((current) => toggleLayer(current, layer)),
    [],
  );
  const onSetProjection = useCallback(
    (projection: ProjectionId) => setState((current) => ({ ...current, projection })),
    [],
  );
  const onSetCentre = useCallback(
    (centre: number) => setState((current) => ({ ...current, centre })),
    [],
  );
  const onToggleClosedPassages = useCallback(
    () =>
      setState((current) => ({
        ...current,
        respectClosedPassages: !current.respectClosedPassages,
      })),
    [],
  );

  const route = readRoute(state);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full max-w-none flex-col gap-3 p-4 sm:max-w-none md:w-4/5 lg:w-3/4"
      >
        <SheetHeader className="space-y-0.5 text-left">
          <SheetTitle>World Map</SheetTitle>
        </SheetHeader>
        <WorldMapChart
          className="min-h-0 flex-1"
          state={state}
          route={route}
          overlay={overlay}
          onSelect={onSelect}
          onRuler={onRuler}
          onToggleLayer={onToggleLayer}
          onSetProjection={onSetProjection}
          onSetCentre={onSetCentre}
          onToggleClosedPassages={onToggleClosedPassages}
        />
      </SheetContent>
    </Sheet>
  );
}
