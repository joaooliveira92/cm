import type { BottomBarPlan } from "../chrome/bottom-bar/index.js";
import { createContext, use } from "react";
import type { ClubId, LeagueSelectionSnapshot } from "@cm-clone/contracts";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import type { ClubSelectionRecord } from "../create/clubSelection.js";
import type { GenerationState } from "../create/generation.js";

export type CommitStatus = "idle" | "committing" | "committed";

export interface CreationSession {
  /** The scope this career is being created at (Screen 3). `null` until League and Nation
   *  Selection is submitted, which is also the gate on world generation: nothing is generated
   *  before the user has said how large the world should be. */
  readonly leagueSelection: LeagueSelectionSnapshot | null;
  readonly saveName: string;
  readonly managerName: string;
  readonly archetype: ManagerArchetype;
  readonly pillars: PillarDistribution;
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
  readonly retryGeneration: () => void;
  /** The only write path for the club selection. It reads the current world's id itself and
   *  records both halves, so a club can never be recorded against a world that is not the current
   *  one; `null` clears the pick. Outside a ready generation it is a no-op. */
  readonly selectClub: (club: { readonly clubId: ClubId; readonly clubName: string } | null) => void;
  /**
   * The bar the current step wants, as a plan rather than as rendered markup:
   * the shell decides where a control sits, so a step cannot invent its own
   * footer layout. `null` restores the shell's own plan for the step.
   */
  readonly registerBottomBar: (plan: BottomBarPlan | null) => void;
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
