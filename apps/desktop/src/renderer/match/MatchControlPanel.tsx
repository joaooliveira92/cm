import { PlayerId, type TacticSlot } from "@cm-clone/contracts";
import {
  MENTALITY_OPTIONS,
  PRESSING_OPTIONS,
  TEMPO_OPTIONS,
  type Formation,
  type Mentality,
  type Pressing,
  type Tempo,
} from "@cm-clone/shared";
import { useRef } from "react";
import { dispatchAction } from "../actions/dispatch.js";
import { Alert } from "../components/ui/alert.js";
import { Badge } from "../components/ui/badge.js";
import { Button } from "../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import { SELECT_CLASS } from "./controls.js";
import { useMatchContext } from "./MatchProvider.js";
import { MatchControlContext, useMatchControlContext } from "./matchControlContext.js";
import { useMatchControl, type MatchControlInput } from "./useMatchControl.js";

/* ---------------------------------------------------------------------------
 * The Match day live control panel as a compound (Phase 2): the provider holds
 * the panel's draft/open/flags state behind a shared context, and the focused
 * sub-components — TeamInstructionSliders, SubstitutionControl and
 * InjuryDecisionModal — consume that context instead of an eleven-prop drill.
 *
 * The state itself lives in `useMatchControl`; the context types in
 * `matchControlContext.ts`.
 * ------------------------------------------------------------------------- */

/** Live team-instruction slider (AC-33): one roving tab stop per slider, so Tab
 *  cycles between the three controls (Mentality → Tempo → Pressing) and
 *  ArrowLeft/ArrowRight toggle between the three options of the focused one —
 *  native Enter/Space on the active option still set it directly. */
const InstructionSlider = <T extends string>({
  label,
  options,
  value,
  onChange,
  actionId,
}: {
  readonly label: string;
  readonly options: ReadonlyArray<T>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly actionId: string;
}) => {
  const groupRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = options.indexOf(value);
    if (index < 0) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + options.length) % options.length;
    onChange(options[nextIndex]!);
    // Focus follows the value so the roving tab stop lands where it just moved.
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-action-id]",
    );
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div ref={groupRef} role="group" aria-label={label} onKeyDown={onKeyDown}>
      <p className="text-xs text-text-secondary">{label}</p>
      <div className="mt-1 flex gap-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === value ? "default" : "secondary"}
            size="sm"
            data-action-id={actionId}
            tabIndex={option === value ? 0 : -1}
            aria-pressed={option === value}
            className="capitalize"
            onClick={() => onChange(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
};

/** Compound sub-component (Phase 2): the three live Team Instruction sliders plus the
 *  Apply toggle, reading its tactic from the panel context and driving change through the
 *  registered Actions (ADR-0012). */
const TeamInstructionSliders = () => {
  const { state } = useMatchControlContext();
  const tactic = state.tactic;
  if (!tactic) return null;
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-text-body">Team instructions</p>
      <div className="flex gap-6">
        <InstructionSlider<Mentality>
          label="Mentality"
          options={MENTALITY_OPTIONS}
          value={tactic.mentality}
          actionId="set-live-mentality"
          onChange={(mentality) => void dispatchAction("set-live-mentality", { value: mentality })}
        />
        <InstructionSlider<Tempo>
          label="Tempo"
          options={TEMPO_OPTIONS}
          value={tactic.tempo}
          actionId="set-live-tempo"
          onChange={(tempo) => void dispatchAction("set-live-tempo", { value: tempo })}
        />
        <InstructionSlider<Pressing>
          label="Pressing"
          options={PRESSING_OPTIONS}
          value={tactic.pressing}
          actionId="set-live-pressing"
          onChange={(pressing) => void dispatchAction("set-live-pressing", { value: pressing })}
        />
      </div>
      <p className="mt-1 text-xs text-text-muted">
        Formation stays {tactic.formation as Formation} live — use the pre-match Tactics screen to
        redraft slots.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        data-action-id="apply-live-tactics"
        onClick={() => void dispatchAction("apply-live-tactics")}
      >
        Apply tactics change
      </Button>
    </div>
  );
};

/** Compound sub-component (Phase 2): the capped two-step off/on substitution draft plus the
 *  shorthanded and forced-off alerts that explain how to fill the gap. Reads on-pitch state and
 *  the draft from the panel context; submits through the registered `make-substitution` Action. */
const SubstitutionControl = () => {
  const { state } = useMatchControlContext();
  const tactic = state.tactic;
  if (!tactic) return null;
  const onPitchIds = new Set(tactic.slots.map((slot: TacticSlot) => slot.playerId));
  const bench = state.squad.filter((player) => !onPitchIds.has(player.id));
  const fullNameOf = (id: string) => {
    const player = state.squad.find((p) => p.id === id);
    return player ? `${player.firstName} ${player.lastName}` : id;
  };
  return (
    <>
      {state.isShorthanded && (
        <Alert variant="destructive">
          <p className="font-semibold">Playing with {state.onPitchCount} men</p>
          <p className="mt-1">
            A player is off with no substitute left. Rearrange the remaining players in the
            tactics panel below to fill the formation before resuming.
          </p>
        </Alert>
      )}

      {state.mode._tag === "injury-prompt" && state.mode.severity === "red" && !state.isShorthanded && (
        <Alert variant="destructive">
          <p className="font-semibold">A severe injury has forced a player off.</p>
          <p className="mt-1">
            No subs left — rearrange the remaining players in the tactics panel below.
          </p>
        </Alert>
      )}

      <div>
        <p className="mb-1 text-xs font-semibold text-text-body">Make a substitution</p>
        <div className="flex items-end gap-2">
          <div>
            <p className="text-xs text-text-secondary">Off</p>
            <Select
              value={state.outPlayerId}
              disabled={state.subsStatus.capReached}
              onValueChange={(value) => {
                if (value !== null) {
                  void dispatchAction("set-live-substitute-off", {
                    playerId: PlayerId.make(value),
                  });
                }
              }}
            >
              <SelectTrigger
                data-action-id="set-live-substitute-off"
                aria-label="Player to bring off"
                className={SELECT_CLASS}
              >
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select player</SelectItem>
                {tactic.slots.map((slot: TacticSlot) => (
                  <SelectItem key={slot.playerId} value={slot.playerId}>
                    {fullNameOf(slot.playerId)} ({slot.position})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-text-secondary">On</p>
            <Select
              value={state.inPlayerId}
              disabled={state.subsStatus.capReached}
              onValueChange={(value) => {
                if (value !== null) {
                  void dispatchAction("set-live-substitute-in", {
                    playerId: PlayerId.make(value),
                  });
                }
              }}
            >
              <SelectTrigger
                data-action-id="set-live-substitute-in"
                aria-label="Player to bring on"
                className={SELECT_CLASS}
              >
                <SelectValue placeholder="Select player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select player</SelectItem>
                {bench.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            data-action-id="make-substitution"
            disabled={state.subsStatus.capReached || !state.outPlayerId || !state.inPlayerId}
            onClick={() => void dispatchAction("make-substitution")}
          >
            Make substitution
          </Button>
        </div>
        {state.subAlert && (
          <p role="alert" className="mt-1 text-xs text-text-warning">
            {state.subAlert}
          </p>
        )}
      </div>
    </>
  );
};

/** Compound sub-component (Phase 2): the orange no-subs knock decision — play on (crippled) or
 *  bring the player off to 10 men. Only renders while the decision is genuinely pending. */
const InjuryDecisionModal = () => {
  const { state } = useMatchControlContext();
  if (state.mode._tag !== "injury-decision" || !state.orangeInjury) return null;
  return (
    <Alert className="border-text-warning/40 bg-text-warning/10 text-text-warning">
      <p className="font-semibold">
        {state.orangeInjury.playerId} has a knock and you&apos;ve no subs left.
      </p>
      <p className="mt-1">
        Play on (crippled, at risk of escalation to red) or bring them off and play with 10.
      </p>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-action-id="play-on"
          onClick={() => void dispatchAction("play-on")}
        >
          Play on
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          data-action-id="bring-off"
          onClick={() => void dispatchAction("bring-off")}
        >
          Bring off (10 men)
        </Button>
      </div>
    </Alert>
  );
};

/** The panel header: the toggle button plus the severe-injury badge. Reads open/draft state
 *  from context; dispatching keeps the header a thin view (ADR-0012). */
const PanelHeader = () => {
  const { state, meta } = useMatchControlContext();
  return (
    <button
      type="button"
      ref={meta.toggleRef}
      data-action-id="toggle-control-panel"
      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold ${FOCUS_RING.join(" ")}`}
      onClick={() => void dispatchAction("toggle-control-panel")}
    >
      <span>
        Tactics &amp; substitutions
        {state.injuryPrompt && (
          <Badge className="ml-2" variant={state.hasRedInjury ? "destructive" : "warning"}>
            {state.hasRedInjury ? "Severe injury — must re-sub" : "Knock — sub or play on"}
          </Badge>
        )}
      </span>
      <span className="text-text-secondary">{state.open ? "Hide" : "Show"}</span>
    </button>
  );
};

/** The panel provider: publishes the state `useMatchControl` owns and lays the
 *  compound out. Renders nothing until the tactic has loaded. */
const MatchControlProvider = (input: MatchControlInput) => {
  const value = useMatchControl(input);
  if (value === null) return null;
  const { state } = value;
  const { open, isHalftime, status, subsStatus } = state;

  return (
    <MatchControlContext.Provider value={value}>
      <section className="mt-4 rounded-panel border border-panel-border bg-panel-bg shadow-panel">
        <PanelHeader />
        {open && (
          <div className="space-y-4 border-t border-border-subtle p-4 text-sm">
            <div>
              <p className="text-xs text-text-secondary">
                Substitutions used: {subsStatus.used}/5 · Windows used: {subsStatus.windowsUsed}/3
                {subsStatus.capReached && <span className="ml-2 text-destructive">Cap reached</span>}
              </p>
            </div>

            <SubstitutionControl />
            <InjuryDecisionModal />

            <div>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={isHalftime}
                  onChange={(event) => value.actions.setIsHalftime(event.target.checked)}
                  className={`accent-text-highlight ${FOCUS_RING.join(" ")}`}
                />
                Apply as a halftime instruction (doesn&apos;t consume a substitution window)
              </label>
            </div>

            <TeamInstructionSliders />

            {status && <p className="text-xs text-text-muted">{status}</p>}
          </div>
        )}
      </section>
    </MatchControlContext.Provider>
  );
};

/** The outgoing component (Phase 2 replacement for the monolithic `MatchControlPanel`): a thin
 *  stance that funnels the live match facts from the provider context into the compound.
 *  Rendered only while a match is live (the `MatchOngoing` variant). */
export const MatchControlPanel = () => {
  const { state } = useMatchContext();
  const match = state.match;
  if (match === null) return null;
  return (
    <MatchControlProvider
      homeClubId={match.homeClubId}
      subsStatus={state.homeSubs}
      onPitchCount={state.homeOnPitchCount}
      injuries={state.chunkInjuries}
    />
  );
};
