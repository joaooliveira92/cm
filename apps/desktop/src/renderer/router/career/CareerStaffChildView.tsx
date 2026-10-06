import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerRouteProps, StaffScreenProps } from "./types.js";
import { decodeStaffSurface } from "./utils/surfaceParams.js";

/** A person in a club's backroom (`/career/$saveId/club/$clubId/staff/$staffKey`).
 *  The staff key is passed through as it arrived: a key naming no one is the
 *  RPC's `StaffNotFoundError`, rendered by the screen, not an address error. */
export const CareerStaffChildView = ({
  screenId,
  Screen,
}: CareerRouteProps<StaffScreenProps>) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodeStaffSurface(
        params.saveId ?? "",
        params.clubId ?? "",
        params.staffKey ?? "",
      )}
    />
  );
};