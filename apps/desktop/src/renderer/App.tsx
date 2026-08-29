import { useEffect, useState } from "react";
import type { SaveSummary } from "@cm-clone/contracts";
import type { ManagerArchetype, PillarDistribution } from "@cm-clone/shared";
import { CreationStep1 } from "./CreationStep1.js";
import { FixturesScreen } from "./FixturesScreen.js";
import { LeagueTableScreen } from "./LeagueTableScreen.js";
import { MatchDayScreen } from "./MatchDayScreen.js";
import { SeasonSummaryScreen } from "./SeasonSummaryScreen.js";
import { SquadScreen } from "./SquadScreen.js";
import { TacticsScreen } from "./TacticsScreen.js";
import { TransfersScreen } from "./TransfersScreen.js";

type CareerScreen =
  | "squad"
  | "tactics"
  | "transfers"
  | "league table"
  | "fixtures"
  | "match day"
  | "season summary";

type CreationStep = "manager" | "club" | "review";

interface CreationState {
  step: CreationStep;
  saveName: string;
  managerName: string;
  archetype: ManagerArchetype;
  pillars: PillarDistribution;
  provisionalId: string | null;
}

const DEFAULT_PILLARS: PillarDistribution = {
  tacticalAcumen: 3,
  influence: 3,
  regimen: 3,
  technicalCoaching: 3,
};

export const App = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [loadedSave, setLoadedSave] = useState<SaveSummary | null>(null);
  const [screen, setScreen] = useState<CareerScreen>("squad");
  const [status, setStatus] = useState("connecting...");

  const [creating, setCreating] = useState(false);
  const [creationState, setCreationState] = useState<CreationState>({
    step: "manager",
    saveName: "",
    managerName: "",
    archetype: "professor",
    pillars: { ...DEFAULT_PILLARS },
    provisionalId: null,
  });
  const [creationError, setCreationError] = useState<string | null>(null);

  const refresh = async () => {
    const result = await window.cmClone.call("listSaves", undefined);
    if (result._tag === "Failure") return;
    setSaves(result.value);
  };

  useEffect(() => {
    window.cmClone
      .call("ping", undefined)
      .then((result) => {
        setStatus(
          result._tag === "Success"
            ? `main process says: ${result.value}`
            : "failed to reach main process",
        );
      });
    refresh();
  }, []);

  const handleStartCreation = () => {
    setCreating(true);
    setCreationState({
      step: "manager",
      saveName: "",
      managerName: "",
      archetype: "professor",
      pillars: { ...DEFAULT_PILLARS },
      provisionalId: null,
    });
    setCreationError(null);
  };

  const handleCancelCreation = async () => {
    if (creationState.provisionalId) {
      await window.cmClone.call("discardCareer", { id: creationState.provisionalId });
    }
    setCreating(false);
    setCreationState({
      step: "manager",
      saveName: "",
      managerName: "",
      archetype: "professor",
      pillars: { ...DEFAULT_PILLARS },
      provisionalId: null,
    });
    setCreationError(null);
  };

  const handleBeginCareer = async () => {
    setCreationError(null);
    const result = await window.cmClone.call("beginCareer", undefined);
    if (result._tag === "Failure") {
      setCreationError("Failed to start career: " + JSON.stringify(result.error));
      return;
    }
    setCreationState((prev) => ({
      ...prev,
      provisionalId: result.value.id,
      step: "club",
    }));
  };

  const handleCommitCareer = async () => {
    setCreationError(null);
    const { provisionalId, saveName, managerName, archetype, pillars } = creationState;
    if (!provisionalId || !saveName.trim()) {
      setCreationError("Please fill in all required fields");
      return;
    }

    const result = await window.cmClone.call("commitCareer", {
      id: provisionalId,
      name: saveName.trim(),
      selectedClubId: "temp-club-id",
      managerName: managerName.trim() || saveName.trim(),
      archetypeOrigin: archetype,
      pillars,
    });

    if (result._tag === "Failure") {
      const error = result.error as { _tag?: string; errors?: string[] };
      if (error._tag === "InvalidPillarDistributionError") {
        setCreationError("Invalid pillar distribution: " + (error.errors?.join(", ") || "unknown error"));
      } else {
        setCreationError("Failed to create career: " + JSON.stringify(result.error));
      }
      await window.cmClone.call("discardCareer", { id: provisionalId });
      return;
    }

    setCreating(false);
    setCreationState({
      step: "manager",
      saveName: "",
      managerName: "",
      archetype: "professor",
      pillars: { ...DEFAULT_PILLARS },
      provisionalId: null,
    });
    await refresh();
    setLoadedSave(result.value);
  };

  const handleContinue = async (id: string) => {
    const result = await window.cmClone.call("loadSave", { id });
    if (result._tag === "Failure") return;
    setLoadedSave(result.value);
  };

  const handleBackToList = () => {
    setLoadedSave(null);
  };

  const updateCreation = (updates: Partial<CreationState>) => {
    setCreationState((prev) => ({ ...prev, ...updates }));
  };

  if (loadedSave) {
    return (
      <>
        <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-2 text-sm text-slate-100">
          <div className="flex gap-4">
            {(
              [
                "squad",
                "tactics",
                "transfers",
                "league table",
                "fixtures",
                "match day",
                "season summary",
              ] as const
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`rounded px-3 py-1 capitalize ${
                  tab === screen ? "bg-slate-100 text-slate-900" : "bg-slate-800 hover:bg-slate-700"
                }`}
                onClick={() => setScreen(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rounded bg-slate-800 px-3 py-1 hover:bg-slate-700"
            onClick={handleBackToList}
          >
            Back to saves
          </button>
        </nav>
        {screen === "squad" && <SquadScreen saveId={loadedSave.id} />}
        {screen === "tactics" && <TacticsScreen saveId={loadedSave.id} />}
        {screen === "transfers" && <TransfersScreen saveId={loadedSave.id} />}
        {screen === "league table" && <LeagueTableScreen saveId={loadedSave.id} />}
        {screen === "fixtures" && <FixturesScreen saveId={loadedSave.id} />}
        {screen === "match day" && <MatchDayScreen saveId={loadedSave.id} />}
        {screen === "season summary" && <SeasonSummaryScreen saveId={loadedSave.id} />}
      </>
    );
  }

  if (creating) {
    const sum = Object.values(creationState.pillars).reduce((a, b) => a + b, 0);
    const canProceedFromManager = creationState.saveName.trim().length > 0 && sum === 12;

    return (
      <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
        <h1 className="text-2xl font-bold">New Career</h1>

        <div className="mt-6 flex gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full text-center leading-8 ${
                creationState.step === "manager"
                  ? "bg-slate-600"
                  : "bg-slate-800"
              }`}
            >
              1
            </div>
            <span className={creationState.step === "manager" ? "text-slate-100" : "text-slate-500"}>
              Manager
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full text-center leading-8 ${
                creationState.step === "club"
                  ? "bg-slate-600"
                  : creationState.step === "review"
                    ? "bg-slate-600"
                    : "bg-slate-800"
              }`}
            >
              2
            </div>
            <span className={creationState.step === "club" || creationState.step === "review" ? "text-slate-100" : "text-slate-500"}>
              Club
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full text-center leading-8 ${
                creationState.step === "review" ? "bg-slate-600" : "bg-slate-800"
              }`}
            >
              3
            </div>
            <span className={creationState.step === "review" ? "text-slate-100" : "text-slate-500"}>
              Review
            </span>
          </div>
        </div>

        <div className="mt-8 max-w-xl">
          {creationState.step === "manager" && (
            <CreationStep1
              saveName={creationState.saveName}
              managerName={creationState.managerName}
              archetype={creationState.archetype}
              pillars={creationState.pillars}
              onSaveNameChange={(name) => updateCreation({ saveName: name })}
              onManagerNameChange={(name) => updateCreation({ managerName: name })}
              onArchetypeChange={(archetype) => updateCreation({ archetype })}
              onPillarsChange={(pillars) => updateCreation({ pillars })}
            />
          )}
          {creationState.step === "club" && (
            <div className="text-slate-300">
              <h2 className="text-lg font-semibold">Select Club</h2>
              <p className="mt-2 text-sm text-slate-500">
                Club selection will be available in the next step. Click Next to begin career generation.
              </p>
            </div>
          )}
          {creationState.step === "review" && (
            <div className="text-slate-300">
              <h2 className="text-lg font-semibold">Review Career</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex gap-4">
                  <dt className="text-slate-500">Save name:</dt>
                  <dd>{creationState.saveName}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-slate-500">Manager name:</dt>
                  <dd>{creationState.managerName || creationState.saveName}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-slate-500">Archetype:</dt>
                  <dd className="capitalize">{creationState.archetype.replace("_", " ")}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="text-slate-500">Pillars:</dt>
                  <dd>
                    {creationState.pillars.tacticalAcumen}/
                    {creationState.pillars.influence}/
                    {creationState.pillars.regimen}/
                    {creationState.pillars.technicalCoaching}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {creationError && (
            <div className="mt-4 rounded bg-red-900/30 p-3 text-sm text-red-400">
              {creationError}
            </div>
          )}

          <div className="mt-8 flex gap-4">
            <button
              type="button"
              className="rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
              onClick={handleCancelCreation}
            >
              Cancel
            </button>
            {creationState.step === "manager" && (
              <button
                type="button"
                className="rounded bg-slate-600 px-4 py-2 hover:bg-slate-500 disabled:opacity-50"
                onClick={handleBeginCareer}
                disabled={!canProceedFromManager}
              >
                Next: Select Club
              </button>
            )}
            {creationState.step === "club" && (
              <button
                type="button"
                className="rounded bg-slate-600 px-4 py-2 hover:bg-slate-500"
                onClick={() => updateCreation({ step: "review" })}
              >
                Next: Review
              </button>
            )}
            {creationState.step === "review" && (
              <button
                type="button"
                className="rounded bg-green-700 px-4 py-2 hover:bg-green-600"
                onClick={handleCommitCareer}
              >
                Create Career
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Championship Manager Clone</h1>
      <p className="mt-1 text-sm text-slate-400">{status}</p>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Continue career</h2>
        <ul className="mt-2 space-y-1">
          {saves.map((save) => (
            <li key={save.id}>
              <button
                type="button"
                className="text-slate-100 underline hover:text-slate-300"
                onClick={() => handleContinue(save.id)}
              >
                {save.name}
              </button>
            </li>
          ))}
          {saves.length === 0 && <li className="text-slate-500">No saves yet.</li>}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">New career</h2>
        <p className="mt-2 text-sm text-slate-400">
          Click below to start a new career with manager profile selection.
        </p>
        <button
          type="button"
          className="mt-3 rounded bg-slate-700 px-4 py-2 hover:bg-slate-600"
          onClick={handleStartCreation}
        >
          Start New Career
        </button>
      </section>
    </main>
  );
};