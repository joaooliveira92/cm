import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerRouteProps, MatchScreenProps } from "./types.js";
import { decodeMatchSurface } from "./utils/surfaceParams.js";

/** One match-scoped child route surface (`/career/$saveId/match-report/$matchId`). */
export const CareerMatchChildView = ({
  screenId,
  Screen,
}: CareerRouteProps<MatchScreenProps>) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodeMatchSurface(params.saveId ?? "", params.matchId ?? "")}
    />
  );
};