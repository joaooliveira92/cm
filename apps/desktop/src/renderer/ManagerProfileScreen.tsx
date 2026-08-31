import type { ManagerArchetype, ManagerPillar } from "@cm-clone/shared";
import { MANAGER_PILLARS } from "@cm-clone/shared";
import type { SaveId } from "@cm-clone/contracts";
import { useEffect, useRef, useState } from "react";
import { FOCUS_RING } from "./focus.js";
import { getActiveMatch } from "./match/session.js";
import { navigate } from "./navigation/adapter.js";
import { useDialogKeyboard } from "./transfers/dialogKeyboard.js";
import {
  describeRpcError,
  managerProfileAtom,
  retireManagerMutation,
  typedError,
  useAtom,
  useAtomValue,
} from "./rpc.js";

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
 * The Irreversibility Disclosure for retirement (CONTEXT.md): stated before commitment, naming the
 * state the action freezes and the fact that normal navigation cannot reverse it. It is the whole
 * confirmation mechanism — there is no acknowledgement checkbox and no typed-name confirmation
 * beside it, because a second mechanism would only repeat what this sentence already says.
 */
const RETIREMENT_DISCLOSURE =
  "Retiring ends this career permanently. The save becomes read-only: you can still open it and read " +
  "everything in it, but it will accept no further decisions, and nothing in the game can undo this.";

/**
 * The retire confirmation dialog. `Cancel` takes initial focus and Escape cancels, so neither the
 * keyboard's default action nor a reflex keypress can end a career; the confirm is a distinct
 * destructive control labelled with the verb rather than a generic "OK".
 *
 * Local to this screen on purpose: Quit Confirmation (ticket 03) is the second dialog of this shape
 * and the one that will settle the shared pattern. Extracting a shared component from a single
 * consumer now would fix the wrong shape first.
 */
const RetireManagerDialog = ({
  onCancel,
  onConfirm,
  pending,
  error,
}: {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly pending: boolean;
  readonly error: string | null;
}) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => cancelRef.current,
    onEscape: onCancel,
  });

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Retire Manager"
        onKeyDown={onKeyDown}
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
      >
        <h2 className="text-lg font-semibold">Retire Manager</h2>
        <p className="mt-2 text-sm text-slate-300">{RETIREMENT_DISCLOSURE}</p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className={`rounded bg-slate-700 px-3 py-1 text-sm ${FOCUS_RING.join(" ")}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            className={`rounded bg-red-700 px-3 py-1 text-sm font-semibold text-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
            onClick={onConfirm}
          >
            Retire Manager
          </button>
        </div>
        {error !== null && (
          <p role="alert" className="mt-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Manager Profile (Screen 19): the manager's creation-time identity, plus the club, Season, and
 * tenure that frame it, a passive Active/Archived badge, and the Retire Manager action (Screen 20).
 *
 * Deliberately does not restate the Board Objective, the Verdict, the Consecutive-Miss Counter, or
 * the `ManagerOutcome` — those are season-boundary judgments owned by Season Summary, one tab away.
 * Duplicating them here would create a second source of truth for them.
 */
export const ManagerProfileScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const profileResult = useAtomValue(managerProfileAtom(saveId));
  const [retire, runRetire] = useAtom(retireManagerMutation);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Leaving for the Save List is the whole of "afterwards": no success screen, and the save now
  // reads as archived in the list. Keyed on the mutation's own success so the navigation cannot
  // fire for a retirement the main process refused.
  const retired = retire._tag === "Success";
  useEffect(() => {
    if (retired) navigate({ type: "saveList" });
  }, [retired]);

  const error = typedError(profileResult);
  if (error) return <p className="p-8 text-red-400">{describeRpcError(error)}</p>;
  if (profileResult._tag === "Initial")
    return <p className="p-8 text-slate-400">Loading manager profile...</p>;
  if (profileResult._tag === "Failure")
    return <p className="p-8 text-red-400">Failed to load manager profile</p>;

  const view = profileResult.value;
  const { profile } = view;

  // Retirement's second precondition. A match in flight is renderer-owned state (the resume
  // session in `match/session.ts`) — the main process holds no notion of "mid-match", since a
  // Match Decider stream is resimulated whole on every call. Blocking here, with the reason
  // visible rather than as a silent no-op, is therefore the only place the check has a referent.
  const matchInFlight = getActiveMatch(saveId) !== null;
  const retireBlockedReason = matchInFlight
    ? "Finish the match in progress before retiring."
    : null;

  const retireError = typedError(retire);

  const onConfirmRetire = () => {
    if (retire.waiting) return;
    runRetire({ saveId });
  };

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

      {/* An archived save offers no retire action at all: the career has already ended, and the
          command would be refused by the same guard every other mutation carries. */}
      {!view.archived && (
        <section className="mt-4">
          <button
            type="button"
            disabled={retireBlockedReason !== null}
            className={`rounded border border-red-800 px-3 py-1 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
            onClick={() => setDialogOpen(true)}
          >
            Retire Manager
          </button>
          {retireBlockedReason !== null && (
            <p className="mt-2 text-sm text-slate-400">{retireBlockedReason}</p>
          )}
        </section>
      )}

      {dialogOpen && (
        <RetireManagerDialog
          onCancel={() => setDialogOpen(false)}
          onConfirm={onConfirmRetire}
          pending={retire.waiting}
          error={retireError ? describeRpcError(retireError) : null}
        />
      )}
    </main>
  );
};
