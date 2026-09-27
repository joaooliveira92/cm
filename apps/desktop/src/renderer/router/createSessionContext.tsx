import type { BottomBarPlan } from "../chrome/bottom-bar/index.js";
import { createContext, use } from "react";
import type { ClubId, LeagueSelectionSnapshot, NationId } from "@cm-clone/contracts";
import type { Formation, ManagerArchetype, PillarDistribution, TacticalStylePreset } from "@cm-clone/shared";
import type { ClubSelectionRecord } from "../create/clubSelection.js";
import type { FavoriteTeamRecord } from "../create/favoriteTeam.js";
import type { GenerationState } from "../create/generation.js";

export type CommitStatus = "idle" | "committing" | "committed";

/** Which sub-panel of the Manager step ("Step 2 of 4") is showing: the personal
 *  details form (1), the pillar-allocation panel (2), or the style & appearance
 *  panel (3). Lives in the session so the shell's bottom bar can drive the same
 *  progression the in-panel stepper does. */
export type ManagerSubStep = 1 | 2 | 3;

export interface CreationSession {
  /** The scope this career is being created at (Screen 3). `null` until League and Nation
   *  Selection is submitted, which is also the gate on world generation: nothing is generated
   *  before the user has said how large the world should be. */
  readonly leagueSelection: LeagueSelectionSnapshot | null;
  readonly saveName: string;
  /** The manager's personal details, collected in the Manager step's first sub-panel. The display
   *  name is derived as `${firstName} ${lastName}`; nothing stores it as one field. */
  readonly firstName: string;
  readonly lastName: string;
  /** The manager's nationality, or `null` until chosen. Always one of the world's nations, which
   *  generation copies into every save. */
  readonly nationalityId: NationId | null;
  /** ISO `YYYY-MM-DD`, or `""` until chosen. */
  readonly dateOfBirth: string;
  /** The club the manager supports, bound to the world it was picked from. Never read directly —
   *  `selectedFavoriteTeamOf` is the read path, because a record left over from a replaced world
   *  is not a selection. Optional: not every manager supports a club. */
  readonly favoriteTeam: FavoriteTeamRecord | null;
  /** The manager's tactical identity: the formation and style their first Tactic seeds from, or
   *  `null` until the Style & Appearance panel has collected them. They start unset so the panel's
   *  completion gate is a real choice rather than a pre-filled no-op. */
  readonly preferredFormation: Formation | null;
  readonly preferredStyleId: TacticalStylePreset | null;
  /** The manager's appearance. `avatarPortraitKey` is null until a portrait asset set exists; the
   *  two colours are the accent scheme the colour/initials fallback renders. */
  readonly avatarPortraitKey: string | null;
  readonly avatarPrimaryColor: string;
  readonly avatarSecondaryColor: string;
  readonly archetype: ManagerArchetype;
  readonly pillars: PillarDistribution;
  /** The Manager step's active sub-panel: 1 = personal details, 2 = manager identity. */
  readonly managerStep: ManagerSubStep;
  /** The provisional-world lifecycle. `provisionalIdOf` is the only way to reach the save id. */
  readonly generation: GenerationState;
  /** The picked club, bound to the world it was picked from. Never read directly — `selectedClubOf`
   *  is the read path, because a record left over from a replaced world is not a selection. */
  readonly clubSelection: ClubSelectionRecord | null;
  readonly commit: CommitStatus;
  readonly error: string | null;
}

export interface CreateSessionApi {
  readonly session: CreationSession;
  readonly update: (patch: Partial<CreationSession>) => void;
  /** Move the Manager step to a specific sub-panel (1 = personal details, 2 = manager identity). */
  readonly setManagerStep: (step: ManagerSubStep) => void;
  readonly retryGeneration: () => void;
  /** The only write path for the club selection. It reads the current world's id itself and
   *  records both halves, so a club can never be recorded against a world that is not the current
   *  one; `null` clears the pick. Outside a ready generation it is a no-op. */
  readonly selectClub: (club: { readonly clubId: ClubId; readonly clubName: string } | null) => void;
  /** The same binding rule for the manager's favorite team: both halves are recorded against the
   *  current world's id, and outside a ready generation it is a no-op. */
  readonly selectFavoriteTeam: (team: { readonly clubId: ClubId; readonly clubName: string } | null) => void;
  /**
   * The bar the current step wants, as a plan rather than as rendered markup:
   * the shell decides where a control sits, so a step cannot invent its own
   * footer layout. `null` restores the shell's own plan for the step.
   */
  readonly registerBottomBar: (plan: BottomBarPlan | null) => void;
  /**
   * Leave the flow, subject to the discard confirmation. Every player-initiated
   * exit calls this rather than navigating away itself, so a step cannot ship a
   * departure that skips the gate.
   */
  readonly requestLeave: () => void;
}

/**
 * The three creation steps read the parent-owned session through this context.
 * Defined in its own module (not in `createFlow.tsx`) so the step screens can
 * consume it without importing the layout that imports them.
 */
export const CreateSessionContext = createContext<CreateSessionApi | null>(null);

/** The step routes' read path onto the parent-owned session. */
export const useCreateSessionApi = (): CreateSessionApi => {
  const api = use(CreateSessionContext);

  if (api === null) {
    throw new Error("creation step rendered outside CreateFlowLayout");
  }

  return api;
};
