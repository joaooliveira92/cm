import { useEffect, useState } from "react";
import type { SaveSummary } from "@cm-clone/contracts";
import { MatchDayScreen } from "./MatchDayScreen.js";
import { SquadScreen } from "./SquadScreen.js";
import { TacticsScreen } from "./TacticsScreen.js";

type CareerScreen = "squad" | "tactics" | "match day";

export const App = () => {
  const [saves, setSaves] = useState<ReadonlyArray<SaveSummary>>([]);
  const [newSaveName, setNewSaveName] = useState("");
  const [loadedSave, setLoadedSave] = useState<SaveSummary | null>(null);
  const [screen, setScreen] = useState<CareerScreen>("squad");
  const [status, setStatus] = useState("connecting...");

  const refresh = async () => {
    const result = await window.cmClone.call("listSaves", undefined);
    setSaves(result);
  };

  useEffect(() => {
    window.cmClone
      .call("ping", undefined)
      .then((pong) => setStatus(`main process says: ${pong}`))
      .catch(() => setStatus("failed to reach main process"));
    refresh();
  }, []);

  const onCreateSave = async () => {
    if (!newSaveName.trim()) return;
    await window.cmClone.call("createSave", { name: newSaveName.trim() });
    setNewSaveName("");
    await refresh();
  };

  const onContinue = async (id: string) => {
    const save = await window.cmClone.call("loadSave", { id });
    setLoadedSave(save);
  };

  if (loadedSave) {
    return (
      <>
        <nav className="flex gap-2 border-b border-slate-800 bg-slate-950 p-2 text-sm text-slate-100">
          {(["squad", "tactics", "match day"] as const).map((tab) => (
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
        {screen === "squad" ? (
          <SquadScreen saveId={loadedSave.id} />
        ) : screen === "tactics" ? (
          <TacticsScreen saveId={loadedSave.id} />
        ) : (
          <MatchDayScreen saveId={loadedSave.id} />
        )}
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
