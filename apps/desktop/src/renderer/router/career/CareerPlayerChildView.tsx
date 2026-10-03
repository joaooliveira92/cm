import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerRouteProps, PlayerScreenProps } from "./types.js";
import { decodePlayerSurface } from "./utils/surfaceParams.js";

/** One player-scoped child route surface (`/career/$saveId/player/$playerId/...`). */
export const CareerPlayerChildView = ({
  screenId,
  Screen,
}: CareerRouteProps<PlayerScreenProps>) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodePlayerSurface(params.saveId ?? "", params.playerId ?? "")}
    />
  );
};