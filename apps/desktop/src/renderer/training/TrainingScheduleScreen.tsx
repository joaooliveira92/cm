/**
 * Training Schedule (training-schedule-and-delegation 03) — a sub-surface of the Training area.
 *
 * The manager plans the microcycle, the gap before the club's next Fixture, as five sessions of a
 * type and an intensity, or applies one of the named templates. Edits are a local draft; Save
 * Schedule and Reset Schedule sit in the career shell's bottom bar as registered `training`-scope
 * Actions, beside Continue. The schedule is stored and shown here; what it does to Condition is
 * ticket 04.
 *
 * Reached from the Training Overview's Schedule card at `/career/$saveId/training/schedule`.
 */
import { useEffect, useMemo } from "react";
import type { SaveId } from "@cm-clone/contracts";
import {
  TRAINING_INTENSITIES,
  TRAINING_SCHEDULE_TEMPLATES,
  TRAINING_SESSION_TYPES,
  TRAINING_TEMPLATE_NAMES,
  sameTrainingSessions,
  type TrainingIntensity,
  type TrainingSession,
  type TrainingSessionType,
} from "@cm-clone/shared";
import { registerActionHandler, dispatchAction } from "../actions/dispatch.js";
import { clearScopeState, setScopeState } from "../actions/scopeState.js";
import { useScreenBottomBarActions } from "../chrome/bottom-bar/index.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError } from "../rpc.js";
import { useTrainingScheduleDraft } from "./useTrainingScheduleDraft.js";
import { SESSION_TYPE_LABELS, INTENSITY_LABELS, TEMPLATE_LABELS, templateLabel } from "./trainingScheduleCopy.js";

const PAGE_CLASS = `flex flex-col gap-4 p-8 text-foreground ${FOCUS_RING.join(" ")}`;
const SELECT_CLASS = "w-40";

const CONFLICT_MESSAGE =
  "A newer schedule was saved since you opened this page. Your draft is kept — refresh to load the current version.";

const typeItems = TRAINING_SESSION_TYPES.map((type) => ({ label: SESSION_TYPE_LABELS[type], value: type }));
const intensityItems = TRAINING_INTENSITIES.map((intensity) => ({
  label: INTENSITY_LABELS[intensity],
  value: intensity,
}));

const withSlot = (
  sessions: ReadonlyArray<TrainingSession>,
  index: number,
  change: Partial<TrainingSession>,
): ReadonlyArray<TrainingSession> =>
  sessions.map((session, slot) => (slot === index ? { ...session, ...change } : session));

export const TrainingScheduleScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const {
    viewResult,
    viewError,
    view,
    delegated,
    assistantName,
    assistantReason,
    sessions,
    dirty,
    conflict,
    status,
    setSessions,
    save,
    setDelegated,
    reset,
    refresh,
  } = useTrainingScheduleDraft(saveId);

  // The Training sub-screens share one scope, so the Actions below are only available while this
  // screen says it is open (see their `available` predicates).
  useEffect(() => {
    setScopeState({ trainingScheduleOpen: true });
    return () => clearScopeState("trainingScheduleOpen");
  }, []);
  useEffect(() => {
    setScopeState({ trainingScheduleDelegated: delegated });
    return () => clearScopeState("trainingScheduleDelegated");
  }, [delegated]);

  useEffect(() => {
    const unregisters = [
      registerActionHandler("save-training-schedule", () => {
        void save();
      }),
      registerActionHandler("reset-training-schedule", reset),
      registerActionHandler("delegate-training-schedule", () => {
        void setDelegated(true);
      }),
      registerActionHandler("take-over-training-schedule", () => {
        void setDelegated(false);
      }),
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [save, reset, setDelegated]);

  // One delegation verb at a time, by who plans; while the assistant plans, Save and Reset are
  // disabled and the bar's reason line says why.
  const bottomBarActions = useMemo(
    () => ({
      buttons: [
        delegated
          ? {
              id: "take-over-training-schedule",
              actionId: "take-over-training-schedule",
              label: "Take Over Schedule",
              disabled: false,
              onTrigger: () => void dispatchAction("take-over-training-schedule"),
            }
          : {
              id: "delegate-training-schedule",
              actionId: "delegate-training-schedule",
              label: "Delegate to Assistant",
              disabled: false,
              onTrigger: () => void dispatchAction("delegate-training-schedule"),
            },
        {
          id: "reset-training-schedule",
          actionId: "reset-training-schedule",
          label: "Reset Schedule",
          disabled: delegated || !dirty,
          onTrigger: () => void dispatchAction("reset-training-schedule"),
        },
        {
          id: "save-training-schedule",
          actionId: "save-training-schedule",
          label: "Save Schedule",
          disabled: delegated || !dirty,
          onTrigger: () => void dispatchAction("save-training-schedule"),
        },
      ],
      reason: delegated ? `${assistantName} is planning the schedule. Take it over to edit it.` : null,
    }),
    [assistantName, delegated, dirty],
  );
  useScreenBottomBarActions(view === null ? null : bottomBarActions);

  if (viewError !== null) {
    return (
      <main tabIndex={-1} data-focus-id="training" aria-label="Training Schedule" className={PAGE_CLASS}>
        <Alert variant="destructive">
          <p>{describeRpcError(viewError)}</p>
        </Alert>
      </main>
    );
  }
  if (viewResult._tag !== "Success" || view === null) {
    return (
      <main tabIndex={-1} data-focus-id="training" aria-label="Training Schedule" className={PAGE_CLASS}>
        <p className="text-text-secondary">Loading the training schedule...</p>
      </main>
    );
  }

  const fixture = view.nextFixture;

  return (
    <main
      tabIndex={-1}
      data-focus-id="training"
      aria-labelledby="training-schedule-heading"
      className={PAGE_CLASS}
    >
      <header>
        <h1 id="training-schedule-heading" className="text-title">
          Training Schedule
        </h1>
        <p className="text-body text-text-secondary">
          {fixture === null
            ? "No Fixture left this Season."
            : `Planning for ${fixture.opponentClubName} (${fixture.isHome ? "home" : "away"}), ${fixture.date}.`}
        </p>
        <p className="text-body text-text-bright" data-testid="schedule-planner">
          {delegated
            ? `Planned by ${assistantName}, your assistant${assistantReason === null ? "" : `: ${templateLabel(sessions)}, because ${assistantReason}`}.`
            : "Planned by you."}
        </p>
      </header>

      <section aria-labelledby="training-templates-heading" className="flex flex-col gap-2">
        <h2 id="training-templates-heading" className="text-heading text-text-highlight">
          Templates
        </h2>
        <div className="flex flex-wrap gap-1">
          {TRAINING_TEMPLATE_NAMES.map((name) => {
            const applied = sameTrainingSessions(TRAINING_SCHEDULE_TEMPLATES[name], sessions);
            return (
              <Button
                key={name}
                type="button"
                variant={applied ? "default" : "secondary"}
                aria-pressed={applied}
                disabled={delegated}
                onClick={() => setSessions(TRAINING_SCHEDULE_TEMPLATES[name])}
              >
                {TEMPLATE_LABELS[name]}
              </Button>
            );
          })}
        </div>
        <p className="text-body text-text-secondary">Draft: {templateLabel(sessions)}</p>
      </section>

      <section aria-labelledby="training-sessions-heading" className="flex flex-col gap-2">
        <h2 id="training-sessions-heading" className="text-heading text-text-highlight">
          Sessions
        </h2>
        <ol className="flex flex-col gap-2">
          {sessions.map((session, index) => (
            <li key={index} className="flex items-center gap-3">
              <span className="w-20 text-body font-semibold">Session {index + 1}</span>
              <Select
                disabled={delegated}
                value={session.type}
                items={typeItems}
                onValueChange={(value) => {
                  if (value !== null) setSessions(withSlot(sessions, index, { type: value as TrainingSessionType }));
                }}
              >
                <SelectTrigger aria-label={`Session ${index + 1} type`} className={SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                disabled={delegated}
                value={session.intensity}
                items={intensityItems}
                onValueChange={(value) => {
                  if (value !== null)
                    setSessions(withSlot(sessions, index, { intensity: value as TrainingIntensity }));
                }}
              >
                <SelectTrigger aria-label={`Session ${index + 1} intensity`} className={SELECT_CLASS}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intensityItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ol>
      </section>

      {(conflict !== null || status !== null) && (
        <section className="flex items-center gap-3">
          {conflict !== null && (
            <>
              <span role="alert" className="text-body text-text-danger" data-testid="schedule-conflict">
                {CONFLICT_MESSAGE}
              </span>
              <Button type="button" variant="secondary" onClick={refresh}>
                Refresh
              </Button>
            </>
          )}
          {status !== null && <span className="text-body text-text-bright">{status}</span>}
        </section>
      )}
    </main>
  );
};
