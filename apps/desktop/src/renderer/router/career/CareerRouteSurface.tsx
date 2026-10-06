import { RouteView } from "../RouteView.js";
import { RouteParamErrorScreen } from "./RouteParamErrorScreen.js";
import type { CareerRouteSurfaceProps } from "./types.js";

/**
 * The boundary every career child route surface renders through, and the only
 * place that decides what a malformed address looks like: the screen inside its
 * semantic `RouteView` when the decode succeeded, `RouteParamErrorScreen` when
 * it did not.
 *
 * Each surface supplies its own `decoded` — which parameters it needs and how
 * they decode is the surface's business — so the two branches and the `RouteView`
 * contract are written once instead of once per surface.
 */
export const CareerRouteSurface = <P extends object>({
  screenId,
  Screen,
  decoded,
  fullHeight,
  fitHeight,
}: CareerRouteSurfaceProps<P>) => {
  if (decoded._tag === "Malformed") return <RouteParamErrorScreen reason={decoded.reason} />;
  return (
    <RouteView screenId={screenId} fullHeight={fullHeight} fitHeight={fitHeight}>
      <Screen {...decoded.success} />
    </RouteView>
  );
};