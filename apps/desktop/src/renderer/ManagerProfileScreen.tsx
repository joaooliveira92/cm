import type { ManagerArchetype, ManagerPillar } from "@cm-clone/shared";
import { MANAGER_PILLARS } from "@cm-clone/shared";
import type { SaveId } from "@cm-clone/contracts";
import { useEffect, useRef, useState } from "react";
import { Alert } from "./components/ui/alert.js";
import { Badge } from "./components/ui/badge.js";
import { Button } from "./components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card.js";
import { FOCUS_RING } from "./focus.js";
import { getActiveMatch } from "./match/session.js";
import { navigate } from "./navigation/adapter.js";
import { useDialogKeyboard } from "./transfers/dialogKeyboard.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "./theme.js";
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
        {/* Shared modal anatomy: chrome-gradient title band over the strong-panel
            body (theme.ts `MODAL_*` constants). */}
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
    if (retired) navigate({ type: "mainMenu" });
  }, [retired]);

  const error = typedError(profileResult);
  if (error) return <p className="p-8 text-destructive">{describeRpcError(error)}</p>;
  if (profileResult._tag === "Initial")
    return <p className="p-8 text-text-secondary">Loading manager profile...</p>;
  if (profileResult._tag === "Failure")
    return <p className="p-8 text-destructive">Failed to load manager profile</p>;

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
    <main tabIndex={-1} className={`min-h-screen bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Club</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-body">{view.clubName}</p>
          <p className="mt-1 text-sm text-text-secondary">Season {view.seasonNumber}</p>
          <p className="mt-1 text-sm text-text-secondary">
            Tenure: {view.tenureSeasons} {view.tenureSeasons === 1 ? "season" : "seasons"}
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-lg">Management Philosophy</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            {MANAGER_PILLARS.map((pillar) => (
              <div key={pillar} className="flex justify-between">
                <dt className="text-text-secondary">{PILLAR_LABELS[pillar]}</dt>
                <dd className="font-semibold tabular-nums text-text-primary">{profile.pillars[pillar]}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* An archived save offers no retire action at all: the career has already ended, and the
          command would be refused by the same guard every other mutation carries. */}
      {!view.archived && (
        <section className="mt-4">
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
