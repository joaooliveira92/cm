import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { ClubId, type LeagueSelectionSnapshot } from "@cm-clone/contracts";
import type { PillarDistribution } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { ClubSelectionScreen } from "../ClubSelectionScreen.js";
import { CreationStep1 } from "../CreationStep1.js";
import { LeagueSelectionScreen } from "../LeagueSelectionScreen.js";
import {
  beginCareer,
  commitCareer,
  describeRpcError,
  discardCareer,
} from "../rpc.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { GenerationStatus } from "../create/GenerationStatus.js";
import { CHROME_BAND } from "../theme.js";
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
} from "../create/generation.js";
import { RouteView } from "./RouteView.js";
import {
  CreateSessionContext,
  type CreateSessionApi,
  type CreationSession,
} from "./createSessionContext.js";

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
  archetype: "professor",
  pillars: { ...DEFAULT_PILLARS },
  generation: initialGeneration,
  commit: "idle",
  error: null,
});

const useCreateSession = (): CreateSessionApi => {
  const api = useContext(CreateSessionContext);

  if (api === null) {
    throw new Error("creation step rendered outside CreateFlowLayout");
  }

  return api;
};

type CreationStep = "leagues" | "1" | "2" | "3";

const stepOf = (pathname: string): CreationStep => {
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

const STEP_LABELS: Readonly<Record<CreationStep, string>> = {
  leagues: "Step 1 of 4 · League & Nation",
  "1": "Step 2 of 4 · Manager",
  "2": "Step 3 of 4 · Club",
  "3": "Step 4 of 4 · Review",
};

const runAtEdge = <A, E>(
  effect: Effect.Effect<A, E>,
): Promise<Result.Result<A, E>> => Effect.runPromise(Effect.result(effect));

const sumPillars = (pillars: PillarDistribution): number =>
  Object.values(pillars).reduce((total, value) => total + value, 0);

export const LeagueSelectionRouteContent = () => {
  const { update } = useCreateSession();

  const handleContinue = useCallback(
    (snapshot: LeagueSelectionSnapshot): void => {
      update({ leagueSelection: snapshot });
      navigate({ type: "createStep1" });
    },
    [update],
  );

  const handleBack = useCallback((): void => {
    navigate({ type: "mainMenu" });
  }, []);

  return (
    <RouteView screenId="createLeagues">
      <LeagueSelectionScreen
        onContinue={handleContinue}
        onBack={handleBack}
      />
    </RouteView>
  );
};

export const StepOneRouteContent = () => {
  const { session, update } = useCreateSession();

  const handleSaveNameChange = useCallback(
    (saveName: string): void => {
      update({ saveName });
    },
    [update],
  );

  const handleManagerNameChange = useCallback(
    (managerName: string): void => {
      update({ managerName });
    },
    [update],
  );

  const handleArchetypeChange = useCallback(
    (archetype: CreationSession["archetype"]): void => {
      update({ archetype });
    },
    [update],
  );

  const handlePillarsChange = useCallback(
    (pillars: PillarDistribution): void => {
      update({ pillars });
    },
    [update],
  );

  return (
    <RouteView screenId="createStep1">
      <CreationStep1
        saveName={session.saveName}
        managerName={session.managerName}
        archetype={session.archetype}
        pillars={session.pillars}
        onSaveNameChange={handleSaveNameChange}
        onManagerNameChange={handleManagerNameChange}
        onArchetypeChange={handleArchetypeChange}
        onPillarsChange={handlePillarsChange}
      />
    </RouteView>
  );
};

export const StepTwoRouteContent = () => {
  const { session, retryGeneration } = useCreateSession();
  const provisionalId = provisionalIdOf(session.generation);

  return (
    <RouteView screenId="createStep2">
      {provisionalId === null ? (
        <GenerationStatus
          state={session.generation}
          onRetry={retryGeneration}
        />
      ) : (
        <ClubSelectionScreen saveId={provisionalId} />
      )}
    </RouteView>
  );
};

export const StepThreeRouteContent = () => {
  const { session } = useCreateSession();

  return (
    <RouteView screenId="createStep3">
      <ReviewPane session={session} />
    </RouteView>
  );
};

export const CreateFlowLayout = () => {
  const [session, setSession] = useState<CreationSession>(createEmptySession);
  const [bottomBarContent, setBottomBarContent] =
    useState<ReactNode | null>(null);
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
      const outcome = await runAtEdge(beginCareer());

      if (Result.isFailure(outcome)) {
        const message = describeRpcError(outcome.failure);
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

  const registerBottomBar = useCallback(
    (content: ReactNode | null): void => {
      setBottomBarContent(content);
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

    update({
      commit: "committing",
      error: null,
    });

    const outcome = await runAtEdge(
      commitCareer({
        id: provisionalId,
        name: saveName,
        selectedClubId: ClubId.make("temp-club-id"),
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
          ? `Invalid pillar distribution: ${
              error.error.errors?.join(", ") || "unknown error"
            }`
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
    setBottomBarContent(null);
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

  const contextValue = useMemo<CreateSessionApi>(
    () => ({
      session,
      update,
      retryGeneration,
      registerBottomBar,
    }),
    [registerBottomBar, retryGeneration, session, update],
  );

  return (
    <CreateSessionContext.Provider value={contextValue}>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className={CHROME_BAND}>
          <h1 className="truncate text-lg font-bold">New Career</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-primary">
              {STEP_LABELS[step]}
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-8">
          <Outlet />

          {session.error !== null && (
            <Alert
              variant="destructive"
              className="mt-4"
            >
              {session.error}
            </Alert>
          )}

          {step === "1" && session.generation._tag !== "Ready" && (
            <div className="mt-6">
              <GenerationStatus
                state={session.generation}
                onRetry={retryGeneration}
              />
            </div>
          )}
        </main>

        <footer className="border-t border-border-subtle bg-surface px-4 py-3">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            {bottomBarContent ?? (
              <div className="flex gap-4">
                {step === "1" && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBackToLeagues}
                    >
                      Back: Leagues
                    </Button>

                    <div>
                      <Button
                        type="button"
                        onClick={handleGoToClubSelection}
                        disabled={!managerStepComplete || !selectionReady}
                        aria-describedby={
                          blocked === null
                            ? undefined
                            : "generation-blocked-reason"
                        }
                      >
                        Next: Select Club
                      </Button>

                      {blocked !== null && (
                        <p
                          id="generation-blocked-reason"
                          className="mt-2 text-sm text-text-secondary"
                        >
                          {blocked}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {step === "2" && (
                  <Button
                    type="button"
                    onClick={handleGoToReview}
                    disabled={!selectionReady}
                  >
                    Next: Review
                  </Button>
                )}

                {step === "3" && (
                  <Button
                    type="button"
                    onClick={handleCreateCareer}
                    disabled={session.commit === "committing"}
                  >
                    Create Career
                  </Button>
                )}
              </div>
            )}
          </div>
        </footer>
      </div>
    </CreateSessionContext.Provider>
  );
};

const ReviewPane = ({
  session,
}: {
  readonly session: CreationSession;
}) => {
  const leagueScope =
    session.leagueSelection === null
      ? "Not selected"
      : `${session.leagueSelection.estimate.playableNationCount} playable nation${
          session.leagueSelection.estimate.playableNationCount === 1 ? "" : "s"
        }, ${
          session.leagueSelection.estimate.playableCompetitionCount
        } playable competition${
          session.leagueSelection.estimate.playableCompetitionCount === 1
            ? ""
            : "s"
        }`;

  return (
    <div className="text-text-body">
      <h2 className="text-lg font-semibold">Review Career</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-4">
          <dt className="text-text-muted">Save name:</dt>
          <dd>{session.saveName}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Manager name:</dt>
          <dd>{session.managerName || session.saveName}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Archetype:</dt>
          <dd className="capitalize">
            {session.archetype.replaceAll("_", " ")}
          </dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">League scope:</dt>
          <dd>{leagueScope}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Pillars:</dt>
          <dd>
            {session.pillars.tacticalAcumen}/{session.pillars.influence}/
            {session.pillars.regimen}/{session.pillars.technicalCoaching}
          </dd>
        </div>
      </dl>
    </div>
  );
};