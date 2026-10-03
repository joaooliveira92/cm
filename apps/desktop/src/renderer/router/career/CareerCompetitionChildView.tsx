import { useParams } from "@tanstack/react-router";
import { CareerRouteSurface } from "./CareerRouteSurface.js";
import type { CareerRouteProps, CompetitionScreenProps } from "./types.js";
import { decodeCompetitionSurface } from "./utils/surfaceParams.js";

/** One competition-scoped child route surface
 *  (`/career/$saveId/competition/$competitionId/...`). */
export const CareerCompetitionChildView = ({
  screenId,
  Screen,
}: CareerRouteProps<CompetitionScreenProps>) => {
  const params = useParams({ strict: false });
  return (
    <CareerRouteSurface
      screenId={screenId}
      Screen={Screen}
      decoded={decodeCompetitionSurface(params.saveId ?? "", params.competitionId ?? "")}
    />
  );
};