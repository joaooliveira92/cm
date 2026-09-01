import { createContext } from "react";
import type { LeagueSelectionSnapshot } from "@cm-clone/contracts";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import type { ReactNode } from "react";
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
  readonly commit: CommitStatus;
  readonly error: string | null;
}

export interface CreateSessionApi {
  readonly session: CreationSession;
  readonly update: (patch: Partial<CreationSession>) => void;
  readonly retryGeneration: () => void;
  /** The content the current step wants rendered in the shell's bottom bar. */
  readonly registerBottomBar: (content: ReactNode | null) => void;
}

/**
 * The three creation steps read the parent-owned session through this context.
 * Defined in its own module (not in `createFlow.tsx`) so the step screens can
 * consume it without importing the layout that imports them.
 */
export const CreateSessionContext = createContext<CreateSessionApi | null>(null);