import { useEffect, useState } from "react";
import type { SaveSummary } from "@cm-clone/contracts";
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

export const App = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [newSaveName, setNewSaveName] = useState("");
  const [loadedSave, setLoadedSave] = useState<SaveSummary | null>(null);
  const [screen, setScreen] = useState<CareerScreen>("squad");
  const [status, setStatus] = useState("connecting...");

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

  const onCreateSave = async () => {
    if (!newSaveName.trim()) return;
    const result = await window.cmClone.call("createSave", { name: newSaveName.trim() });
    if (result._tag === "Failure") return;
    setNewSaveName("");
    await refresh();
  };

  const onContinue = async (id: string) => {
    const result = await window.cmClone.call("loadSave", { id });
    if (result._tag === "Failure") return;
    setLoadedSave(result.value);
  };

  if (loadedSave) {
    return (
      <>
        <nav className="flex gap-2 border-b border-slate-800 bg-slate-950 p-2 text-sm text-slate-100">
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
                onClick={() => onContinue(save.id)}
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
        <div className="mt-2 flex gap-2">
          <input
            className="rounded bg-slate-800 px-2 py-1"
            value={newSaveName}
            onChange={(event) => setNewSaveName(event.target.value)}
            placeholder="Save name"
          />
          <button
            type="button"
            className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
            onClick={onCreateSave}
          >
            Create
          </button>
        </div>
      </section>
    </main>
  );
};
