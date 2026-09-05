/**
 * The creation flow's session: the provisional-world lifecycle, the club
 * selection write path, the career commit, the step guards, and the bottom-bar
 * plan. `CreateFlowLayout` is the only caller; everything the shell needs comes
 * back through the five members below, so the layout stays pure JSX.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { type ClubId } from "@cm-clone/contracts";
import type { PillarDistribution } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { beginCareer, commitCareer, describeRpcError, discardCareer } from "../rpc.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import {
  creationCancelButton,
  describeCreationBottomBar,
  withShellCancel,
  type BottomBarPlan,
} from "../chrome/bottom-bar/index.js";
import {
  abandon,
  blockedReason,
  canStartGeneration,
  commit,
  generationFailed,
  generationSucceeded,
  initialGeneration,
  isSelectionReady,
  provisionalIdOf,
  reenter,
  startGeneration,
  type GenerationState,
  type GenerationTransition,
} from "./generation.js";
import { selectedClubOf } from "./clubSelection.js";
import type { CreateSessionApi, CreationSession } from "../router/createSessionContext.js";

const DEFAULT_PILLARS: PillarDistribution = {
  tacticalAcumen: 3,
  influence: 3,
  regimen: 3,
  technicalCoaching: 3,
};

const createEmptySession = (): CreationSession => ({
  leagueSelection: null,
  saveName: "",
  managerName: "",
  // The archetype picker was deliberately retired from step 1; the field stays because the career
  // submission (`archetypeOrigin`) and the Review summary still read it, so every career now
  // records this fixed origin and the manager is defined purely by their pillar allocation.
  archetype: "professor",
  pillars: { ...DEFAULT_PILLARS },
  generation: initialGeneration,
  clubSelection: null,
  commit: "idle",
  error: null,
});

export type CreationStep = "leagues" | "1" | "2" | "3";

export const stepOf = (pathname: string): CreationStep => {
  if (pathname.endsWith("/leagues")) {
    return "leagues";
  }

  if (pathname.endsWith("/step-2")) {
    return "2";
  }

  if (pathname.endsWith("/step-3")) {
    return "3";
  }

  return "1";
};

const runAtEdge = <A, E>(
  effect: Effect.Effect<A, E>,
): Promise<Result.Result<A, E>> => Effect.runPromise(Effect.result(effect));

const sumPillars = (pillars: PillarDistribution): number =>
  Object.values(pillars).reduce((total, value) => total + value, 0);

export interface CreateFlowSession {
  readonly session: CreationSession;
  readonly step: CreationStep;
  /** The bar the shell renders: the step's own plan unless a step registered one. */
  readonly bottomBarPlan: BottomBarPlan;
  readonly retryGeneration: () => void;
  /** What the step routes read through `CreateSessionContext`. */
  readonly contextValue: CreateSessionApi;
}

export const useCreateSession = (): CreateFlowSession => {
  const [session, setSession] = useState<CreationSession>(createEmptySession);
  const [registeredBar, setRegisteredBar] = useState<BottomBarPlan | null>(null);
  const sessionRef = useRef(session);
  const generationRunRef = useRef<Promise<void> | null>(null);
  const mountedRef = useRef(true);
  const { pathname } = useLocation();
  const step = stepOf(pathname);

  const update = useCallback((patch: Partial<CreationSession>): void => {
    const nextSession = {
      ...sessionRef.current,
      ...patch,
    };

    sessionRef.current = nextSession;

    if (mountedRef.current) {
      setSession(nextSession);
    }
  }, []);

  const applyGeneration = useCallback(
    (
      transition: (
        state: GenerationState,
      ) => GenerationTransition,
    ): GenerationState => {
      const result = transition(sessionRef.current.generation);

      update({ generation: result.state });

      if (result.discard !== null) {
        void runAtEdge(discardCareer(result.discard));
      }

      return result.state;
    },
    [update],
  );

  const runGeneration = useCallback((): Promise<void> => {
    if (generationRunRef.current !== null) {
      return generationRunRef.current;
    }

    if (!canStartGeneration(sessionRef.current.generation)) {
      return Promise.resolve();
    }

    applyGeneration(startGeneration);

    const run = (async (): Promise<void> => {
      const snapshot = sessionRef.current.leagueSelection;
      if (snapshot === null) return;
      const outcome = await runAtEdge(beginCareer(snapshot.id));

      if (Result.isFailure(outcome)) {
        const failure = outcome.failure;
        // The snapshot's catalogue fingerprint no longer matches the live catalogue (or the id
        // names no snapshot at all). Generation was refused before touching disk; the only
        // recovery is to re-run selection, so the player is taken back to the League step.
        if (
          failure._tag === "RemoteFailure" &&
          failure.error._tag === "PresetFingerprintMismatchError"
        ) {
          applyGeneration((state) =>
            generationFailed(
              state,
              "Your league selection no longer matches the current database.",
            ),
          );
          navigate({ type: "createLeagues" });
          return;
        }
        const message = describeRpcError(failure);
        applyGeneration((state) => generationFailed(state, message));
        return;
      }

      applyGeneration((state) =>
        generationSucceeded(state, outcome.success.id),
      );
    })().finally(() => {
      generationRunRef.current = null;
    });

    generationRunRef.current = run;

    return run;
  }, [applyGeneration]);

  const retryGeneration = useCallback((): void => {
    void runGeneration();
  }, [runGeneration]);

  /**
   * The single write path for the club selection. It reads the current world's id itself rather
   * than taking one from the caller, which is what makes recording a club against a world that is
   * not the current one impossible instead of merely discouraged. Outside a ready generation it is
   * a no-op — the only affordances that can call it are mounted exclusively in `Ready`.
   */
  const selectClub = useCallback(
    (club: { readonly clubId: ClubId; readonly clubName: string } | null): void => {
      const provisionalId = provisionalIdOf(sessionRef.current.generation);

      if (provisionalId === null) {
        return;
      }

      update({
        clubSelection: club === null ? null : { ...club, provisionalId },
      });
    },
    [update],
  );

  const registerBottomBar = useCallback(
    (plan: BottomBarPlan | null): void => {
      setRegisteredBar(plan);
    },
    [],
  );

  const handleCancel = useCallback((): void => {
    navigate({ type: "mainMenu" });
  }, []);

  const handleBackToLeagues = useCallback((): void => {
    navigate({ type: "createLeagues" });
  }, []);

  const handleGoToClubSelection = useCallback((): void => {
    navigate({ type: "createStep2" });
  }, []);

  const handleGoToReview = useCallback((): void => {
    navigate({ type: "createStep3" });
  }, []);

  const handleCommitCareer = useCallback(async (): Promise<void> => {
    const currentSession = sessionRef.current;
    const provisionalId = provisionalIdOf(currentSession.generation);
    const saveName = currentSession.saveName.trim();
    const managerName = currentSession.managerName.trim() || saveName;

    if (provisionalId === null || saveName.length === 0) {
      update({ error: "Please fill in all required fields" });
      return;
    }

    const selectedClub = selectedClubOf(currentSession);

    // The selection is bound to the world it was picked from, so a record left over from a
    // replaced world reads as no selection here rather than reaching the commit as a dangling id.
    if (selectedClub === null) {
      update({ error: "Choose a club to continue." });
      navigate({ type: "createStep2" });
      return;
    }

    update({
      commit: "committing",
      error: null,
    });

    const outcome = await runAtEdge(
      commitCareer({
        id: provisionalId,
        name: saveName,
        selectedClubId: selectedClub.clubId,
        managerName,
        archetypeOrigin: currentSession.archetype,
        pillars: currentSession.pillars,
      }),
    );

    if (Result.isFailure(outcome)) {
      const error = outcome.failure;
      const message =
        error._tag === "RemoteFailure" &&
          error.error._tag === "InvalidPillarDistributionError"
          ? `Invalid pillar distribution: ${error.error.errors?.join(", ") || "unknown error"
          }`
          : error._tag === "RemoteFailure" && error.error._tag === "ClubNotFoundError"
            ? "That club is no longer available. Choose another."
            : `Failed to create career: ${describeRpcError(error)}`;

      update({
        commit: "idle",
        error: message,
      });
      applyGeneration(abandon);
      navigate({ type: "createStep1" });
      return;
    }

    update({ commit: "committed" });
    applyGeneration(commit);
    navigateCareer(
      {
        type: "squad",
        saveId: outcome.success.id,
      },
      "pointer",
    );
  }, [applyGeneration, update]);

  const handleCreateCareer = useCallback((): void => {
    void handleCommitCareer();
  }, [handleCommitCareer]);

  useEffect(() => {
    mountedRef.current = true;
    applyGeneration(reenter);

    return () => {
      mountedRef.current = false;
    };
  }, [applyGeneration]);

  useEffect(() => {
    if (session.leagueSelection !== null) {
      void runGeneration();
    }
  }, [runGeneration, session.leagueSelection]);

  useEffect(() => {
    if (step === "leagues") {
      return;
    }

    if (sessionRef.current.leagueSelection === null) {
      navigate({ type: "createLeagues" });
      return;
    }

    const generation = sessionRef.current.generation;

    if (
      step !== "1" &&
      !isSelectionReady(generation) &&
      generation._tag !== "Committed"
    ) {
      navigate({ type: "createStep1" });
    }
  }, [step]);

  useEffect(() => {
    setRegisteredBar(null);
  }, [step]);

  useEffect(
    () => () => {
      applyGeneration(abandon);
    },
    [applyGeneration],
  );

  const managerStepComplete =
    session.saveName.trim().length > 0 && sumPillars(session.pillars) === 12;
  const selectionReady = isSelectionReady(session.generation);
  const blocked = blockedReason(session.generation);
  /** Continue past the club step is gated on the decision that step exists to collect. */
  const clubPicked = selectedClubOf(session) !== null;

  const contextValue = useMemo<CreateSessionApi>(
    () => ({
      session,
      update,
      retryGeneration,
      selectClub,
      registerBottomBar,
    }),
    [registerBottomBar, retryGeneration, selectClub, session, update],
  );

  // One bar, described rather than assembled: Cancel keeps its zone on every
  // step, the step's forward verb keeps its own, and the reason row is always
  // in the layout, so nothing under the pointer moves when a step blocks or
  // unblocks. A step that wants different controls registers a different plan —
  // never a different layout.
  const bottomBarPlan =
    registeredBar === null
      ? describeCreationBottomBar({
        step,
        generationBlockedReason: blocked,
        managerStepComplete,
        selectionReady,
        clubPicked,
        committing: session.commit === "committing",
        onCancel: handleCancel,
        onBackToLeagues: handleBackToLeagues,
        onGoToClubSelection: handleGoToClubSelection,
        onGoToReview: handleGoToReview,
        onCreateCareer: handleCreateCareer,
      })
      : withShellCancel(registeredBar, creationCancelButton(handleCancel));

  return { session, step, bottomBarPlan, retryGeneration, contextValue };
};
