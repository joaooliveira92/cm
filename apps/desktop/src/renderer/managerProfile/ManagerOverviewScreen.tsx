import type { ManagerArchetype, ManagerPillar } from "@cm-clone/shared";
import { MANAGER_PILLARS } from "@cm-clone/shared";
import type { SaveId } from "@cm-clone/contracts";
import { useEffect, useRef, useState } from "react";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { FOCUS_RING } from "../focus.js";
import { getActiveMatch } from "../match/session.js";
import { navigate } from "../navigation/adapter.js";
import { useDialogKeyboard } from "../transfers/dialogKeyboard.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "../theme.js";
import {
  describeRpcError,
  managerProfileAtom,
  retireManagerMutation,
  typedError,
  useAtom,
  useAtomValue,
} from "../rpc.js";

/** Player-facing Archetype names. */
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

const RETIREMENT_DISCLOSURE =
  "Retiring ends this career permanently. The save becomes read-only: you can still open it and read " +
  "everything in it, but it will accept no further decisions, and nothing in the game can undo this.";

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
      className={MODAL_SCRIM}
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
        className={MODAL_COMPACT}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">Retire Manager</h2>
        </div>
        <div className={MODAL_BODY}>
          <p className="text-sm text-text-body">{RETIREMENT_DISCLOSURE}</p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
              Retire Manager
            </Button>
          </div>
          {error !== null && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const ManagerOverviewScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const profileResult = useAtomValue(managerProfileAtom(saveId));
  const [retire, runRetire] = useAtom(retireManagerMutation);
  const [dialogOpen, setDialogOpen] = useState(false);

  const retired = retire._tag === "Success";
  useEffect(() => {
    if (retired) navigate({ type: "mainMenu" });
  }, [retired]);

  const error = typedError(profileResult);
  if (error)
    return (
      <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Overview" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
        <Alert variant="destructive">
          <p>{describeRpcError(error)}</p>
        </Alert>
      </main>
    );
  if (profileResult._tag === "Initial")
    return (
      <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Overview" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
        <p className="p-8 text-text-secondary">Loading manager profile...</p>
      </main>
    );
  if (profileResult._tag === "Failure")
    return (
      <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Overview" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
        <Alert variant="destructive">
          <p>Failed to load manager profile</p>
        </Alert>
      </main>
    );

  const view = profileResult.value;
  const { profile } = view;

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
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Overview" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      {view.archived && (
        <Alert className="mb-4">[Archived] This career has ended. The save is read-only.</Alert>
      )}

      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-bold">{profile.managerName}</h1>
        <Badge variant={view.archived ? "secondary" : "success"}>
          {view.archived ? "Archived" : "Active"}
        </Badge>
        {profileResult.waiting && <span className="text-sm text-text-muted">Refreshing…</span>}
      </div>
      <p className="mt-1 text-sm text-text-secondary">{ARCHETYPE_LABELS[profile.archetypeOrigin]}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card className="px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Current Club</p>
          <p className="mt-1 text-base text-text-body">{view.clubName}</p>
          <p className="mt-0.5 text-base text-text-secondary">Season {view.seasonNumber}</p>
          <p className="mt-0.5 text-base text-text-secondary">
            Tenure: {view.tenureSeasons} {view.tenureSeasons === 1 ? "season" : "seasons"}
          </p>
        </Card>

        <Card className="px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Management Philosophy</p>
          <dl className="mt-1 grid grid-cols-2 gap-x-8 gap-y-0.5 text-base">
            {MANAGER_PILLARS.map((pillar) => (
              <div key={pillar} className="flex justify-between">
                <dt className="text-text-secondary">{PILLAR_LABELS[pillar]}</dt>
                <dd className="font-semibold tabular-nums text-text-primary">{profile.pillars[pillar]}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="mt-4 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Personal Details</p>
        <dl className="mt-1 grid grid-cols-2 gap-x-8 gap-y-1 text-base sm:grid-cols-3">
          <div className="flex justify-between">
            <dt className="text-text-secondary">Nationality</dt>
            <dd className="font-semibold text-text-primary">—</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Age</dt>
            <dd className="font-semibold text-text-primary">—</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Reputation</dt>
            <dd className="font-semibold text-text-primary">—</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Preferred Formation</dt>
            <dd className="font-semibold text-text-primary">—</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-text-secondary">Date Appointed</dt>
            <dd className="font-semibold text-text-primary">Season {view.seasonNumber}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Career Record</p>
        <dl className="mt-1 grid grid-cols-3 gap-x-8 gap-y-1 text-base sm:grid-cols-6">
          <div className="text-center">
            <dt className="text-xs text-text-secondary">Played</dt>
            <dd className="text-xl font-bold text-text-primary">—</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-text-secondary">Won</dt>
            <dd className="text-xl font-bold text-green-600">—</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-text-secondary">Drawn</dt>
            <dd className="text-xl font-bold text-text-primary">—</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-text-secondary">Lost</dt>
            <dd className="text-xl font-bold text-red-600">—</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-text-secondary">Goals For</dt>
            <dd className="text-xl font-bold text-text-primary">—</dd>
          </div>
          <div className="text-center">
            <dt className="text-xs text-text-secondary">Goals Against</dt>
            <dd className="text-xl font-bold text-text-primary">—</dd>
          </div>
        </dl>
      </Card>

      <Card className="mt-4 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Trophies Won</p>
        <p className="mt-1 text-base text-text-secondary italic">None yet.</p>
      </Card>

      {!view.archived && (
        <section className="mt-6">
          <Button
            type="button"
            variant="destructive"
            disabled={retireBlockedReason !== null}
            onClick={() => setDialogOpen(true)}
          >
            Retire Manager
          </Button>
          {retireBlockedReason !== null && (
            <p className="mt-2 text-sm text-text-secondary">{retireBlockedReason}</p>
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