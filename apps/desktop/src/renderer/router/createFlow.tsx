import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { type ClubId, type LeagueSelectionSnapshot } from "@cm-clone/contracts";
import type { PillarDistribution } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { ClubSelectionScreen } from "../ClubSelectionScreen.js";
import { CreationStep1 } from "../CreationStep1.js";
import { ActiveLeaguesScreen } from "../activeLeagues/ActiveLeaguesScreen.js";
import {
  beginCareer,
  commitCareer,
  describeRpcError,
  discardCareer,
} from "../rpc.js";
import { Alert } from "../components/ui/alert.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { GenerationStatus } from "../create/GenerationStatus.js";
import { Header } from "../chrome/header/index.js";
import {
  creationCancelButton,
  describeCreationBottomBar,
  ShellBottomBar,
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
} from "../create/generation.js";
import { selectedClubOf } from "../create/clubSelection.js";
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
  clubSelection: null,
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

/**
 * Step 1. The Active Leagues setup screen replaced the League & Nation tree as the primary
 * surface here; the tree is retained and reachable from inside it through Manage leagues. The
 * step's contract with the rest of the flow is unchanged: Continue records the same
 * `LeagueSelectionSnapshot` and lands the player on Step 2 · Manager.
 */
export const LeagueSelectionRouteContent = () => {
  const { update } = useCreateSession();

  const handleContinue = useCallback(
    (snapshot: LeagueSelectionSnapshot): void => {
      update({ leagueSelection: snapshot });
      navigate({ type: "createStep1" });
    },
    [update],
  );

  const handleCancel = useCallback((): void => {
    navigate({ type: "mainMenu" });
  }, []);

  return (
    <RouteView screenId="createLeagues" fill>
      <ActiveLeaguesScreen onContinue={handleContinue} onCancel={handleCancel} />
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
  const { session, retryGeneration, selectClub } = useCreateSession();
  const provisionalId = provisionalIdOf(session.generation);
  const selectedClub = selectedClubOf(session);

  return (
    <RouteView screenId="createStep2" fill>
      {provisionalId === null ? (
        <GenerationStatus
          state={session.generation}
          onRetry={retryGeneration}
        />
      ) : (
        <ClubSelectionScreen
          saveId={provisionalId}
          selectedClubId={selectedClub?.clubId ?? null}
          onSelect={selectClub}
        />
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
          ? `Invalid pillar distribution: ${
              error.error.errors?.join(", ") || "unknown error"
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

  return (
    <CreateSessionContext.Provider value={contextValue}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        {/* The step lives in the adaptive row, not in the title band: it is
            what the header reports about this shell, the same way the career
            shell's row reports the calendar. */}
        <Header.Shell
          title="New Career"
          state={{
            view: "create",
            step: STEP_LABELS[step],
            hint: "Every step is reversible until the career is created",
          }}
        />

        {/* The leagues and club steps are full-height, full-width bands: each is a workspace of
            columns that scroll independently, which a centred `max-w-5xl` `overflow-y-auto`
            column cannot host — the height has to come from the shell rather than from a viewport
            calc inside the step. Every other step keeps the centred reading column. */}
        <main
          className={
            step === "2" || step === "leagues"
              ? "flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-4"
              : "mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto p-8"
          }
        >
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

        {/* One bar, described rather than assembled: Cancel keeps its zone on
            every step, the step's forward verb keeps its own, and the reason
            row is always in the layout, so nothing under the pointer moves when
            a step blocks or unblocks. A step that wants different controls
            registers a different plan — never a different layout. */}
        <ShellBottomBar
          plan={
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
              : withShellCancel(registeredBar, creationCancelButton(handleCancel))
          }
        />
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
          <dt className="text-text-muted">Club:</dt>
          <dd>{selectedClubOf(session)?.clubName ?? "Not selected"}</dd>
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