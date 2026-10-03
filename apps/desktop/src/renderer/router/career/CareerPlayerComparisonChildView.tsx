import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerRouteProps, ComparisonScreenProps } from "./types.js";
import { decodeComparisonSurface } from "./utils/surfaceParams.js";

/** One comparison-scoped child route surface (`/career/$saveId/player-comparison/$playerIds`). */
export const CareerPlayerComparisonChildView = ({
  screenId,
  Screen,
}: CareerRouteProps<ComparisonScreenProps>) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodeComparisonSurface(params.saveId ?? "", params.playerIds ?? "")}
    />
  );
};