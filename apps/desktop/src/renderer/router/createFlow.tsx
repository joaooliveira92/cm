import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { ClubId } from "@cm-clone/contracts";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import type { LeagueSelectionSnapshot } from "@cm-clone/contracts";
import { ClubSelectionScreen } from "../ClubSelectionScreen.js";
import { CreationStep1 } from "../CreationStep1.js";
import { LeagueSelectionScreen } from "../LeagueSelectionScreen.js";
import {
  beginCareer,
  commitCareer,
  describeRpcError,
  discardCareer,
} from "../rpc.js";
import { FOCUS_RING } from "../focus.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { GenerationStatus } from "../create/GenerationStatus.js";
import {
  abandon,
  blockedReason,
  canStartGeneration,
  commit,
  generationFailed,
  generationSucceeded,
  initialGeneration,
  reenter,
  isSelectionReady,
  provisionalIdOf,
  startGeneration,
  type GenerationState,
  type GenerationTransition,
} from "../create/generation.js";
import { RouteView } from "./RouteView.js";

const DEFAULT_PILLARS: PillarDistribution = {
  tacticalAcumen: 3,
  influence: 3,
  regimen: 3,
  technicalCoaching: 3,
};

type CommitStatus = "idle" | "committing" | "committed";

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

const EMPTY_SESSION: CreationSession = {
  leagueSelection: null,
  saveName: "",
  managerName: "",
  archetype: "professor",
  pillars: { ...DEFAULT_PILLARS },
  generation: initialGeneration,
  commit: "idle",
  error: null,
};

interface CreateSessionApi {
  readonly session: CreationSession;
  readonly update: (patch: Partial<CreationSession>) => void;
  readonly retryGeneration: () => void;
}

/** The three creation steps read the parent-owned session through this context. */
export const CreateSessionContext = createContext<CreateSessionApi | null>(null);

const useCreateSession = (): CreateSessionApi => {
  const api = useContext(CreateSessionContext);
  if (api === null) {
    throw new Error("creation step rendered outside CreateFlowLayout");
  }
  return api;
};

/** Which creation stage the current path is. `leagues` is the first: Screen 3 defines the scope
 *  of the world before there is a world, a manager, or a club. */
const stepOf = (pathname: string): "leagues" | "1" | "2" | "3" =>
  pathname.endsWith("/leagues")
    ? "leagues"
    : pathname.endsWith("/step-2")
      ? "2"
      : pathname.endsWith("/step-3")
        ? "3"
        : "1";

const runAtEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<Result.Result<A, E>> =>
  Effect.runPromise(Effect.result(effect));

/**
 * Stage 1: League and Nation Selection (Screen 3). It runs before anything is generated — the
 * snapshot it produces is what unblocks world generation, so the scope is settled before the
 * world it describes is built.
 */
export const LeagueSelectionRouteContent = () => {
  const { update } = useCreateSession();
  return (
    <RouteView screenId="createLeagues">
      <LeagueSelectionScreen
        onContinue={(snapshot) => {
          update({ leagueSelection: snapshot });
          navigate({ type: "createStep1" });
        }}
        onBack={() => navigate({ type: "saveList" })}
      />
    </RouteView>
  );
};

export const StepOneRouteContent = () => {
  const { session, update } = useCreateSession();
  return (
    <RouteView screenId="createStep1">
      <CreationStep1
        saveName={session.saveName}
        managerName={session.managerName}
        archetype={session.archetype}
        pillars={session.pillars}
        onSaveNameChange={(saveName) => update({ saveName })}
        onManagerNameChange={(managerName) => update({ managerName })}
        onArchetypeChange={(archetype) => update({ archetype })}
        onPillarsChange={(pillars) => update({ pillars })}
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
        <GenerationStatus state={session.generation} onRetry={retryGeneration} />
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

/**
 * The `/create` parent route. Owns the ONE provisional creation session shared
 * by the three creation steps (provisional-world lifecycle, manager draft,
 * commit status).
 *
 * Generation runs *underneath* the manager step: `beginCareer` is issued when
 * the flow mounts, not when the player asks for club selection, so the wait is
 * spent making the first real decision rather than watching it. The transition
 * into club selection stays disabled until the world is complete and says why
 * while it is. Leaving creation discards the provisional save idempotently,
 * including when the world is still in flight at the moment of leaving.
 * Reloading a later step without a recoverable in-memory session redirects to
 * step 1.
 */
export const CreateFlowLayout = () => {
  const [session, setSession] = useState<CreationSession>(EMPTY_SESSION);
  const sessionRef = useRef<CreationSession>(session);
  const { pathname } = useLocation();
  const step = stepOf(pathname);

  // The ref is written synchronously, before the render is scheduled, because
  // the async generation continuations read it to decide whether the world they
  // are holding is still wanted. A ref written inside the state updater would
  // lag exactly the readers that matter.
  const update = (patch: Partial<CreationSession>): void => {
    const next = { ...sessionRef.current, ...patch };
    sessionRef.current = next;
    setSession(next);
  };

  /** Apply a lifecycle transition and honour the discard it hands back. */
  const applyGeneration = (transition: (state: GenerationState) => GenerationTransition): void => {
    const { state, discard } = transition(sessionRef.current.generation);
    update({ generation: state });
    if (discard !== null) void runAtEdge(discardCareer(discard));
  };

  const runGeneration = async (): Promise<void> => {
    if (!canStartGeneration(sessionRef.current.generation)) return;
    applyGeneration(startGeneration);
    const outcome = await runAtEdge(beginCareer());
    if (Result.isFailure(outcome)) {
      const message = describeRpcError(outcome.failure);
      applyGeneration((state) => generationFailed(state, message));
      return;
    }
    applyGeneration((state) => generationSucceeded(state, outcome.success.id));
  };

  // Re-arm before anything else this mount does. A development double-invocation runs the
  // teardown below between two mounts of the same component, which leaves the lifecycle in
  // `Abandoned` — a state generation can never start from. Declared first so the re-arm precedes
  // the generation effect in the second pass.
  useEffect(() => {
    applyGeneration(reenter);
  }, []);

  // Generation begins when the scope is settled — the moment League and Nation
  // Selection is submitted — and is masked by the manager step, so the wait is
  // spent making the first real decision rather than watching it. It cannot
  // begin earlier: before the snapshot exists nobody has said how large the
  // world should be, and Screen 3 §1 is explicit that choosing scope must not
  // create the world. The guard inside `runGeneration` is what makes a double
  // mount or a rapid double activation one job rather than two worlds on disk.
  useEffect(() => {
    if (session.leagueSelection === null) return;
    void runGeneration();
  }, [session.leagueSelection]);

  // Reload mid-creation redirects to the front of the flow. The in-memory
  // session is never durable, so a reload always arrives here with an empty
  // session — which now means no league selection either, and the manager step
  // is no longer a safe landing place. Anything past the leagues stage without
  // a snapshot goes back to it; the world-readiness condition still guards the
  // two steps that need a world.
  useEffect(() => {
    if (step === "leagues") return;
    if (sessionRef.current.leagueSelection === null) {
      navigate({ type: "createLeagues" });
      return;
    }
    const generation = sessionRef.current.generation;
    if (step !== "1" && !isSelectionReady(generation) && generation._tag !== "Committed") {
      navigate({ type: "createStep1" });
    }
  }, [step]);

  // Leaving `/create/**` abandons the provisional world. `abandon` discards one
  // that already exists; one still in flight is discarded by
  // `generationSucceeded` when it lands in the abandoned state. A committed
  // career is never discarded.
  useEffect(() => {
    return () => {
      applyGeneration(abandon);
    };
  }, []);

  const handleCommitCareer = async (): Promise<void> => {
    const s = sessionRef.current;
    const provisionalId = provisionalIdOf(s.generation);
    if (provisionalId === null || !s.saveName.trim()) {
      update({ error: "Please fill in all required fields" });
      return;
    }
    update({ commit: "committing", error: null });
    const outcome = await runAtEdge(
      commitCareer({
        id: provisionalId,
        name: s.saveName.trim(),
        selectedClubId: ClubId.make("temp-club-id"),
        managerName: s.managerName.trim() || s.saveName.trim(),
        archetypeOrigin: s.archetype,
        pillars: s.pillars,
      }),
    );
    if (Result.isFailure(outcome)) {
      const error = outcome.failure;
      const message =
        error._tag === "RemoteFailure" && error.error._tag === "InvalidPillarDistributionError"
          ? "Invalid pillar distribution: " + (error.error.errors?.join(", ") || "unknown error")
          : "Failed to create career: " + describeRpcError(error);
      update({ commit: "idle", error: message });
      applyGeneration(abandon);
      navigate({ type: "createStep1" });
      return;
    }
    update({ commit: "committed" });
    applyGeneration(commit);
    navigateCareer({ type: "squad", saveId: outcome.success.id }, "pointer");
  };

  const managerStepComplete = session.saveName.trim().length > 0 && sum(session.pillars) === 12;
  const selectionReady = isSelectionReady(session.generation);
  const blocked = blockedReason(session.generation);

  return (
    <CreateSessionContext.Provider
      value={{ session, update, retryGeneration: () => void runGeneration() }}
    >
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">New Career</h1>

        <div className="mt-6 flex gap-4">
          <StepBadge label="Leagues" active={step === "leagues"} number="1" />
          <StepBadge label="Manager" active={step === "1"} number="2" />
          <StepBadge label="Club" active={step === "2" || step === "3"} number="3" />
          <StepBadge label="Review" active={step === "3"} number="4" />
        </div>

        <div className={step === "leagues" ? "mt-8" : "mt-8 max-w-xl"}>
          <Outlet />
          {session.error && (
            <div className="mt-4 rounded bg-red-900/30 p-3 text-sm text-red-400">
              {session.error}
            </div>
          )}

          {/* The manager step carries the generation status: the wait happens
              here, so this is where a failure has to be recoverable. */}
          {step === "1" && session.generation._tag !== "Ready" && (
            <div className="mt-6">
              <GenerationStatus
                state={session.generation}
                onRetry={() => void runGeneration()}
              />
            </div>
          )}

          {/* The leagues stage renders its own Back and Continue: continuing from it has to run
              submission and snapshot creation, which the shared footer knows nothing about. */}
          <div className={`mt-8 flex gap-4 ${step === "leagues" ? "hidden" : ""}`}>
            <button
              type="button"
              className={`rounded bg-slate-700 px-4 py-2 hover:bg-slate-600 ${FOCUS_RING.join(" ")}`}
              onClick={() => navigate({ type: "saveList" })}
            >
              Cancel
            </button>
            {step === "1" && (
              <button
                type="button"
                className={`rounded bg-slate-700 px-4 py-2 hover:bg-slate-600 ${FOCUS_RING.join(" ")}`}
                onClick={() => navigate({ type: "createLeagues" })}
              >
                Back: Leagues
              </button>
            )}
            {step === "1" && (
              <div>
                <button
                  type="button"
                  className={`rounded bg-slate-600 px-4 py-2 hover:bg-slate-500 disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
                  onClick={() => navigate({ type: "createStep2" })}
                  disabled={!managerStepComplete || !selectionReady}
                  aria-describedby={blocked === null ? undefined : "generation-blocked-reason"}
                >
                  Next: Select Club
                </button>
                {/* A greyed control that does not say why is not acceptable. */}
                {blocked !== null && (
                  <p id="generation-blocked-reason" className="mt-2 text-sm text-slate-400">
                    {blocked}
                  </p>
                )}
              </div>
            )}
            {step === "2" && (
              <button
                type="button"
                className={`rounded bg-slate-600 px-4 py-2 hover:bg-slate-500 ${FOCUS_RING.join(" ")}`}
                onClick={() => navigate({ type: "createStep3" })}
                disabled={!selectionReady}
              >
                Next: Review
              </button>
            )}
            {step === "3" && (
              <button
                type="button"
                className={`rounded bg-green-700 px-4 py-2 hover:bg-green-600 disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
                onClick={() => void handleCommitCareer()}
                disabled={session.commit === "committing"}
              >
                Create Career
              </button>
            )}
          </div>
        </div>
      </main>
    </CreateSessionContext.Provider>
  );
};
const sum = (pillars: PillarDistribution): number =>
  Object.values(pillars).reduce((a, b) => a + b, 0);

const StepBadge = ({
  label,
  active,
  number,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly number: string;
}) => (
  <div className="flex items-center gap-2">
    <div className={`h-8 w-8 rounded-full text-center leading-8 ${active ? "bg-slate-600" : "bg-slate-800"}`}>
      {number}
    </div>
    <span className={active ? "text-slate-100" : "text-slate-500"}>{label}</span>
  </div>
);

const ReviewPane = ({ session }: { readonly session: CreationSession }) => (
  <div className="text-slate-300">
    <h2 className="text-lg font-semibold">Review Career</h2>
    <dl className="mt-4 space-y-2 text-sm">
      <div className="flex gap-4">
        <dt className="text-slate-500">Save name:</dt>
        <dd>{session.saveName}</dd>
      </div>
      <div className="flex gap-4">
        <dt className="text-slate-500">Manager name:</dt>
        <dd>{session.managerName || session.saveName}</dd>
      </div>
      <div className="flex gap-4">
        <dt className="text-slate-500">Archetype:</dt>
        <dd className="capitalize">{session.archetype.replace("_", " ")}</dd>
      </div>
      <div className="flex gap-4">
        <dt className="text-slate-500">League scope:</dt>
        <dd>
          {session.leagueSelection === null
            ? "Not selected"
            : `${session.leagueSelection.estimate.playableNationCount} playable nation${
                session.leagueSelection.estimate.playableNationCount === 1 ? "" : "s"
              }, ${session.leagueSelection.estimate.playableCompetitionCount} playable competition${
                session.leagueSelection.estimate.playableCompetitionCount === 1 ? "" : "s"
              }`}
        </dd>
      </div>
      <div className="flex gap-4">
        <dt className="text-slate-500">Pillars:</dt>
        <dd>
          {session.pillars.tacticalAcumen}/{session.pillars.influence}/
          {session.pillars.regimen}/{session.pillars.technicalCoaching}
        </dd>
      </div>
    </dl>
  </div>
);