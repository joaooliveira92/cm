import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerChildRouteProps } from "./types.js";
import { decodeSaveSurface } from "./utils/surfaceParams.js";

/** One career child route surface: boundary-decode the `saveId`, then render
 *  the screen inside its semantic RouteView (keyboard/palette arrival focuses
 *  the screen's main region by identity; pointer arrival does not). */
export const CareerChildView = ({
  screenId,
  Screen,
  fullHeight = false,
  fitHeight = false,
}: CareerChildRouteProps) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodeSaveSurface(params.saveId ?? "")}
      fullHeight={fullHeight}
      fitHeight={fitHeight}
    />
  );
};