import type { ManagerArchetype, ManagerPillar } from "@cm-clone/shared";
import { MANAGER_PILLARS } from "@cm-clone/shared";
import type { SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "./focus.js";
import { describeRpcError, managerProfileAtom, typedError, useAtomValue } from "./rpc.js";

/** Player-facing Archetype names. UI vocabulary, so it lives in the renderer, not CONTEXT.md. */
const ARCHETYPE_LABELS: Record<ManagerArchetype, string> = {
  professor: "Professor",
  motivator: "Motivator",
  sergeant: "Sergeant",
  academy_head: "Academy Head",
  custom: "Custom Manager",
};

const PILLAR_LABELS: Record<ManagerPillar, string> = {
  tacticalAcumen: "Tactical Acumen",
  influence: "Influence",
  regimen: "Regimen",
  technicalCoaching: "Technical Coaching",
};

/**
 * Manager Profile (Screen 19): the manager's creation-time identity, plus the club, Season, and
 * tenure that frame it, and a passive Active/Archived badge.
 *
 * Deliberately does not restate the Board Objective, the Verdict, the Consecutive-Miss Counter, or
 * the `ManagerOutcome` — those are season-boundary judgments owned by Season Summary, one tab away.
 * Duplicating them here would create a second source of truth for them.
 */
export const ManagerProfileScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const profileResult = useAtomValue(managerProfileAtom(saveId));

  const error = typedError(profileResult);
  if (error) return <p className="p-8 text-red-400">{describeRpcError(error)}</p>;
  if (profileResult._tag === "Initial")
    return <p className="p-8 text-slate-400">Loading manager profile...</p>;
  if (profileResult._tag === "Failure")
    return <p className="p-8 text-red-400">Failed to load manager profile</p>;

  const view = profileResult.value;
  const { profile } = view;

  return (
    <main tabIndex={-1} className={`min-h-screen bg-slate-950 p-8 text-slate-100 ${FOCUS_RING.join(" ")}`}>
      {view.archived && (
        <p className="mb-4 rounded bg-slate-800 p-2 text-sm text-slate-300">
          [Archived] This career has ended. The save is read-only.
        </p>
      )}

      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{profile.managerName}</h1>
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${
            view.archived ? "bg-slate-700 text-slate-300" : "bg-emerald-900/60 text-emerald-300"
          }`}
        >
          {view.archived ? "Archived" : "Active"}
        </span>
        {profileResult.waiting && <span className="text-sm text-slate-500">Refreshing…</span>}
      </div>
      <p className="mt-1 text-sm text-slate-400">{ARCHETYPE_LABELS[profile.archetypeOrigin]}</p>

      <section className="mt-6 rounded border border-slate-800 p-4">
        <h2 className="text-lg font-semibold">Club</h2>
        <p className="mt-2 text-sm text-slate-300">{view.clubName}</p>
        <p className="mt-1 text-sm text-slate-400">Season {view.seasonNumber}</p>
        <p className="mt-1 text-sm text-slate-400">
          Tenure: {view.tenureSeasons} {view.tenureSeasons === 1 ? "season" : "seasons"}
        </p>
      </section>

      <section className="mt-4 rounded border border-slate-800 p-4">
        <h2 className="text-lg font-semibold">Management Philosophy</h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          {MANAGER_PILLARS.map((pillar) => (
            <div key={pillar} className="flex justify-between">
              <dt className="text-slate-400">{PILLAR_LABELS[pillar]}</dt>
              <dd className="font-semibold text-slate-100">{profile.pillars[pillar]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
};
