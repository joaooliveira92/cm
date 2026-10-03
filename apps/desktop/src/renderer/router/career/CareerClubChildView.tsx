import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerRouteProps, ClubScreenProps } from "./types.js";
import { decodeClubSurface } from "./utils/surfaceParams.js";

/**
 * One club-scoped child route surface (`/career/$saveId/club/$clubId/...`).
 *
 * A well-formed `clubId` naming no club in the save reaches the screen, which
 * renders the RPC's club-not-found failure. Only a structurally undecodable
 * parameter is an address error.
 */
export const CareerClubChildView = ({
  screenId,
  Screen,
}: CareerRouteProps<ClubScreenProps>) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodeClubSurface(params.saveId ?? "", params.clubId ?? "")}
    />
  );
};