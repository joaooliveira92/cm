import type { ClubId, CompetitionId, MatchId, PlayerId, SaveId } from "@cm-clone/contracts";
import type { ComponentType } from "react";
import type { RouteParamDecode } from "../../navigation/params.js";

/**
 * The prop contracts a career child route hands its screen, one per route
 * parameter shape. The route decodes; the screen renders. A screen's contract
 * is exactly the parameters its own route segment carries — nothing more, so a
 * route cannot widen a screen's view of the world by handing it a spare param.
 */
export interface CareerScreenProps {
  readonly saveId: SaveId;
}

export interface ClubScreenProps {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}

export interface StaffScreenProps extends ClubScreenProps {
  readonly staffKey: string;
}

export interface PlayerScreenProps {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}

export interface ComparisonScreenProps {
  readonly saveId: SaveId;
  readonly playerIds: ReadonlyArray<PlayerId>;
}

export interface MatchScreenProps {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
}

export interface CompetitionScreenProps {
  readonly saveId: SaveId;
  readonly competitionId: CompetitionId;
}

/**
 * What every career child route surface is *given*: the screen to render, and
 * the identity focus restores to. The decode is the surface's own business, not
 * the caller's, so it is not part of this contract.
 *
 * The `screenId` is fixed per surface and deliberately does NOT include the
 * entity the surface is scoped to: focus restoration resolves a screen by
 * identity, so keying it on the target would make every target a distinct focus
 * scope and leave a back-navigation to a different one unable to restore
 * anything. Which club or player is being read is route state, not focus
 * identity.
 */
export interface CareerRouteProps<P extends object> {
  readonly screenId: string;
  readonly Screen: ComponentType<P>;
}

/**
 * The two `RouteView` height modes a surface chooses between: `fullHeight` for
 * a screen that pins a bar to the bottom of the window even when its content is
 * short, `fitHeight` for a workspace whose panels scroll inside a page that
 * stays put. A reading column takes neither.
 */
export interface CareerChildRouteProps extends CareerRouteProps<CareerScreenProps> {
  /** See `RouteView`'s `fullHeight`. */
  readonly fullHeight?: boolean;
  /** See `RouteView`'s `fitHeight`. */
  readonly fitHeight?: boolean;
}

/** `CareerRouteProps` plus the boundary's decode of the route's own parameters. */
export interface CareerRouteSurfaceProps<P extends object> extends CareerRouteProps<P> {
  readonly decoded: RouteParamDecode<P>;
  /** See `RouteView`'s `fullHeight`. */
  readonly fullHeight?: boolean;
  /** See `RouteView`'s `fitHeight`. */
  readonly fitHeight?: boolean;
}