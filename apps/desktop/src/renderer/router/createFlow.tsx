import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { ClubId, type SaveId } from "@cm-clone/contracts";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { ClubSelectionScreen } from "../ClubSelectionScreen.js";
import { CreationStep1 } from "../CreationStep1.js";
import {
  beginCareer,
  commitCareer,
  describeRpcError,
  discardCareer,
} from "../rpc.js";
import { navigate, navigateCareer } from "../navigation/adapter.js";
import { RouteView } from "./RouteView.js";

const DEFAULT_PILLARS: PillarDistribution = {
  tacticalAcumen: 3,
  influence: 3,
  regimen: 3,
  technicalCoaching: 3,
};

type CreationStatus = "idle" | "generating" | "ready" | "committing" | "committed";

export interface CreationSession {
  readonly saveName: string;
  readonly managerName: string;
  readonly archetype: ManagerArchetype;
  readonly pillars: PillarDistribution;
  readonly provisionalId: SaveId | null;
  readonly status: CreationStatus;
  readonly error: string | null;
}

const EMPTY_SESSION: CreationSession = {
  saveName: "",
  managerName: "",
  archetype: "professor",
  pillars: { ...DEFAULT_PILLARS },
  provisionalId: null,
  status: "idle",
  error: null,
};

interface CreateSessionApi {
  readonly session: CreationSession;
  readonly update: (patch: Partial<CreationSession>) => void;
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

const stepOf = (pathname: string): "1" | "2" | "3" =>
  pathname.endsWith("/step-2") ? "2" : pathname.endsWith("/step-3") ? "3" : "1";

const runAtEdge = <A, E>(effect: Effect.Effect<A, E>): Promise<Result.Result<A, E>> =>
  Effect.runPromise(Effect.result(effect));

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
  const { session } = useCreateSession();
  return (
    <RouteView screenId="createStep2">
      {session.status === "generating" ? (
        <p className="text-slate-400">Generating the world&hellip;</p>
      ) : session.provisionalId !== null ? (
        <ClubSelectionScreen saveId={session.provisionalId} />
      ) : null}
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
 * by the three creation steps (provisional save id, generation status, manager
 * draft, commit status). `beginCareer` still runs before Club Selection; leaving
 * creation discards the provisional save idempotently; reloading a later step
 * without a recoverable in-memory session redirects to step 1.
 */
export const CreateFlowLayout = () => {
  const [session, setSession] = useState<CreationSession>(EMPTY_SESSION);
  const sessionRef = useRef<CreationSession>(session);
  const { pathname } = useLocation();
  const step = stepOf(pathname);

  const update = (patch: Partial<CreationSession>): void => {
    setSession((prev) => {
      const next = { ...prev, ...patch };
      sessionRef.current = next;
      return next;
    });
  };

  // Reload mid-creation (step 2/3 with no recoverable session) redirects to
  // step 1. The in-memory session is never durable, so a reload always arrives
  // here with an empty session.
  useEffect(() => {
    if (step !== "1" && sessionRef.current.provisionalId === null) {
      navigate({ type: "createStep1" });
    }
  }, [step]);

  // Leaving `/create/**` runs idempotent cleanup: discard the provisional save
  // when one was generated and not committed. Fires on unmount; a commit clears
  // `provisionalId` synchronously before navigating, so a committed career is
  // never discarded.
  useEffect(() => {
    return () => {
      const s = sessionRef.current;
      if (s.provisionalId !== null && s.status !== "committed") {
        void runAtEdge(discardCareer(s.provisionalId));
      }
    };
  }, []);

  const handleBeginCareer = async (): Promise<boolean> => {
    if (sessionRef.current.provisionalId !== null) return true;
    update({ status: "generating", error: null });
    const outcome = await runAtEdge(beginCareer());
    if (Result.isFailure(outcome)) {
      update({ status: "idle", error: "Failed to start career: " + describeRpcError(outcome.failure) });
      return false;
    }
    update({ provisionalId: outcome.success.id, status: "ready" });
    return true;
  };

  const handleNextToClub = async (): Promise<void> => {
    const began = await handleBeginCareer();
    if (began) navigate({ type: "createStep2" });
  };

  const handleCommitCareer = async (): Promise<void> => {
    const s = sessionRef.current;
    if (!s.provisionalId || !s.saveName.trim()) {
      update({ error: "Please fill in all required fields" });
      return;
    }
    update({ status: "committing", error: null });
    const outcome = await runAtEdge(
      commitCareer({
        id: s.provisionalId,
        name: s.saveName.trim(),
        selectedClubId: ClubId.make("temp-club-id"),
        managerName: s.managerName.trim() || s.saveName.trim(),
        archetypeOrigin: s.archetype,
        pillars: s.pillars,
      }),
    );
    if (Result.isFailure(outcome)) {
      const error = outcome.failure;
      if (error._tag === "RemoteFailure" && error.error._tag === "InvalidPillarDistributionError") {
        update({
          status: "idle",
          provisionalId: null,
          error:
            "Invalid pillar distribution: " + (error.error.errors?.join(", ") || "unknown error"),
        });
      } else {
        update({
          status: "idle",
          provisionalId: null,
          error: "Failed to create career: " + describeRpcError(error),
        });
      }
      await runAtEdge(discardCareer(s.provisionalId));
      navigate({ type: "createStep1" });
      return;
    }
    update({ status: "committed", provisionalId: null });
    navigateCareer({ type: "squad", saveId: outcome.success.id }, "pointer");
  };

  const canProceedFromManager = session.saveName.trim().length > 0 && sum(session.pillars) === 12;

  return (
    <CreateSessionContext.Provider value={{ session, update }}>
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">New Career</h1>

        <div className="mt-6 flex gap-4">
          <StepBadge label="Manager" active={step === "1"} number="1" />
          <StepBadge label="Club" active={step === "2" || step === "3"} number="2" />
          <StepBadge label="Review" active={step === "3"} number="3" />
        </div>

        <div className="mt-8 max-w-xl">
          <Outlet />
          {session.error && (
            <div className="mt-4 rounded bg-red-900/30 p-3 text-sm text-red-400">
              {session.error}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              type="button"
              className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
              onClick={() => navigate({ type: "saveList" })}
            >
              Cancel
            </button>
            {step === "1" && (
              <button
                type="button"
                className="rounded bg-slate-600 px-4 py-2 hover:bg-slate-500 disabled:opacity-50"
                onClick={() => void handleNextToClub()}
                disabled={!canProceedFromManager || session.status === "generating"}
              >
                Next: Select Club
              </button>
            )}
            {step === "2" && (
              <button
                type="button"
                className="rounded bg-slate-600 px-4 py-2 hover:bg-slate-500"
                onClick={() => navigate({ type: "createStep3" })}
                disabled={session.provisionalId === null || session.status !== "ready"}
              >
                Next: Review
              </button>
            )}
            {step === "3" && (
              <button
                type="button"
                className="rounded bg-green-700 px-4 py-2 hover:bg-green-600 disabled:opacity-50"
                onClick={() => void handleCommitCareer()}
                disabled={session.status === "committing"}
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
        <dt className="text-slate-500">Pillars:</dt>
        <dd>
          {session.pillars.tacticalAcumen}/{session.pillars.influence}/
          {session.pillars.regimen}/{session.pillars.technicalCoaching}
        </dd>
      </div>
    </dl>
  </div>
);