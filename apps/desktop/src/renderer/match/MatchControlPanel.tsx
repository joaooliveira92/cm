import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  PlayerId,
  Tactic,
  type ClubId,
  type InjuryView,
  type SquadPlayerView,
  type SubstitutionStatusView,
  type TacticSlot,
} from "@cm-clone/contracts";
import {
  MENTALITY_OPTIONS,
  PRESSING_OPTIONS,
  TEMPO_OPTIONS,
  type Formation,
  type Mentality,
  type Pressing,
  type Tempo,
} from "@cm-clone/shared";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { clearScopeState, getScopeState, setScopeState } from "../actions/scopeState.js";
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
import { useSeamHotkeys } from "../hotkeys.js";
import { isTextEntryTarget } from "../keymap/keystroke.js";
import { substitutionErrorLabel, validateLiveSubstitution } from "./substitution.js";
import { SELECT_CLASS } from "./controls.js";
import { useMatchContext, type MatchCommand } from "./MatchProvider.js";
import { tacticsAtom, useAtomValue } from "../rpc.js";

/* ---------------------------------------------------------------------------
 * The Match day live control panel as a compound (Phase 2): the provider holds
 * the panel's draft/open/flags state behind a shared context, and the focused
 * sub-components — TeamInstructionSliders, SubstitutionControl and
 * InjuryDecisionModal — consume that context instead of an eleven-prop drill.
 * ------------------------------------------------------------------------- */

interface MatchControlState {
  readonly open: boolean;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly tactic: Tactic | null;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
  readonly isHalftime: boolean;
  readonly status: string | null;
  readonly subAlert: string | null;
  /** Live match facts mirrored from the parent MatchProvider (Phase 1) so sub-components
   *  derive their variants locally instead of receiving boolean props. */
  readonly subsStatus: SubstitutionStatusView;
  readonly onPitchCount: number;
  readonly injuryPrompt: boolean;
  readonly hasRedInjury: boolean;
  readonly orangeInjury: InjuryView | undefined;
  readonly isShorthanded: boolean;
  /** The orange no-subs knock decision: orange injury + cap reached + 11 on pitch. */
  readonly injuryDecisionPrompt: boolean;
  /** The two-step substitution draft is complete enough to confirm (Enter). */
  readonly subDraftComplete: boolean;
}

interface MatchControlActions {
  setIsHalftime: (value: boolean) => void;
}

interface MatchControlMeta {
  readonly toggleRef: RefObject<HTMLButtonElement | null>;
}

interface MatchControlContextValue {
  readonly state: MatchControlState;
  readonly actions: MatchControlActions;
  readonly meta: MatchControlMeta;
}

const MatchControlContext = createContext<MatchControlContextValue | null>(null);

const useMatchControlContext = (): MatchControlContextValue => {
  const ctx = useContext(MatchControlContext);
  if (ctx === null) {
    throw new Error("useMatchControlContext must be used within the Match control panel");
  }
  return ctx;
};

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

      {state.hasRedInjury && !state.isShorthanded && (
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
  if (!state.injuryDecisionPrompt || !state.orangeInjury) return null;
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

/* ---------------------------------------------------------------------------
 * The panel provider: owns the draft/open/flags/tactic state, registers the
 * panel Actions, owns the panel-scoped keyboard seams and publishes the soft
 * overlay `matchPanelOpen` scope state — the topmost-layer contract (AC-20).
 * ------------------------------------------------------------------------- */

const MatchControlProvider = ({
  homeClubId,
  subsStatus,
  onPitchCount,
  injuries,
}: {
  readonly homeClubId: ClubId;
  readonly subsStatus: SubstitutionStatusView;
  readonly onPitchCount: number;
  readonly injuries: ReadonlyArray<InjuryView>;
}) => {
  const { actions: matchActions, meta: matchMeta } = useMatchContext();
  const saveId = matchMeta.saveId;

  const [open, setOpen] = useState(false);
  const [squad, setSquad] = useState<ReadonlyArray<SquadPlayerView>>([]);
  const [tactic, setTactic] = useState<Tactic | null>(null);
  const [outPlayerId, setOutPlayerId] = useState(PlayerId.make(""));
  const [inPlayerId, setInPlayerId] = useState(PlayerId.make(""));
  const [isHalftime, setIsHalftime] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  /** Inline substitution-draft rejection (the validator's reason), never a silent no-op. */
  const [subAlert, setSubAlert] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  const tacticsResult = useAtomValue(tacticsAtom(saveId));

  const injuryPrompt = injuries.some((injury) => injury.teamClubId === homeClubId);
  const hasRedInjury = injuries.some(
    (injury) => injury.teamClubId === homeClubId && injury.tier === "red",
  );
  const orangeInjury = injuries.find(
    (injury) => injury.teamClubId === homeClubId && injury.tier === "orange",
  );
  const isShorthanded = onPitchCount < 11;
  /** The no-subs knock decision modal: orange injury + cap reached + 11 on pitch. */
  const injuryDecisionPrompt = orangeInjury !== undefined && subsStatus.capReached && !isShorthanded;
  /** The two-step substitution draft is complete enough to confirm (Enter). */
  const subDraftComplete = !subsStatus.capReached && outPlayerId !== "" && inPlayerId !== "";

  // The panel-scoped key handlers read a fresh snapshot each keystroke (the
  // seam keeps the functions themselves stable — no re-subscription churn).
  const panelRef = useRef({
    open,
    injuryDecisionPrompt,
    subDraftComplete,
    subDraftStarted: outPlayerId !== "" || inPlayerId !== "",
  });
  panelRef.current = {
    open,
    injuryDecisionPrompt,
    subDraftComplete,
    subDraftStarted: outPlayerId !== "" || inPlayerId !== "",
  };

  useEffect(() => {
    if (injuryPrompt) setOpen(true);
  }, [injuryPrompt]);

  useEffect(() => {
    if (tacticsResult._tag === "Success") {
      const view = tacticsResult.value;
      setSquad(view.squad);
      if (view.tactic) setTactic(view.tactic);
    } else if (tacticsResult._tag === "Failure") {
      setStatus("Failed to load squad/tactic for live control");
    }
  }, [tacticsResult]);

  // The shared submission path: run the command through the provider's mutation seam and render
  // the same status sentences a remote refusal maps to ("applied", silently rejected).
  const runSubmission = async (command: MatchCommand): Promise<void> => {
    setStatus("Submitting...");
    try {
      await matchActions.submitCommand(command, isHalftime);
      setStatus("Applied — the engine may still reject an invalid/over-cap command silently.");
    } catch {
      setStatus("Failed to submit command");
    }
  };

  const onApplyTactics = (): void => {
    if (!tactic) return;
    void runSubmission({ _tag: "ChangeTactics", clubId: homeClubId, tactic });
  };

  // Ticket 11 orange no-subs bring-off: the manager drags the injured player off to 10 men.
  const onBringOff = (): void => {
    if (!orangeInjury) return;
    void runSubmission({ _tag: "ForceOff", clubId: homeClubId, playerId: orangeInjury.playerId });
  };

  const onMakeSubstitution = async (): Promise<void> => {
    if (!tactic) return;
    // Validate the draft against the server-reported caps and the no-subs /
    // same-player rules before submitting — the disabled guard on the button is
    // the primary gate; this rejects with a visible reason instead of a silent
    // no-op (the backend still enforces caps authoritatively).
    const validation = validateLiveSubstitution(subsStatus, String(outPlayerId), String(inPlayerId));
    if (!validation.ok) {
      setSubAlert(substitutionErrorLabel(validation.error!));
      return;
    }
    setSubAlert(null);
    await runSubmission({
      _tag: "MakeSubstitution",
      clubId: homeClubId,
      outPlayerId,
      inPlayerId,
    });
    // Optimistic local update so the on-pitch/bench split is right for the *next* substitution even
    // before the next poll's homeSubs confirms the server accepted it.
    setTactic(
      new Tactic({
        ...tactic,
        slots: tactic.slots.map((slot: TacticSlot) =>
          slot.playerId === outPlayerId ? { ...slot, playerId: inPlayerId } : slot,
        ),
      }),
    );
    setOutPlayerId(PlayerId.make(""));
    setInPlayerId(PlayerId.make(""));
  };

  const onDecisionResolved = (): void => {
    matchActions.resume();
  };

  // Register the panel Actions so buttons and the key map dispatch the same registered handlers
  // (ADR-0012). Decided before the early return so hook order never depends on tactic load.
  useEffect(() => {
    const unregisters = [
      registerActionHandler("toggle-control-panel", () => setOpen((v) => !v)),
      registerActionHandler("apply-live-tactics", () => {
        void onApplyTactics();
      }),
      registerActionHandler("make-substitution", () => {
        void onMakeSubstitution();
      }),
      registerActionHandler("play-on", () => {
        setStatus("Play on — they stay, crippled, with escalation risk.");
        onDecisionResolved();
      }),
      registerActionHandler("bring-off", () => {
        onBringOff();
      }),
      registerActionHandler("set-live-mentality", (params) => {
        if (!tactic) return;
        setTactic(new Tactic({ ...tactic, mentality: (params as { value: Mentality }).value }));
      }),
      registerActionHandler("set-live-tempo", (params) => {
        if (!tactic) return;
        setTactic(new Tactic({ ...tactic, tempo: (params as { value: Tempo }).value }));
      }),
      registerActionHandler("set-live-pressing", (params) => {
        if (!tactic) return;
        setTactic(new Tactic({ ...tactic, pressing: (params as { value: Pressing }).value }));
      }),
      registerActionHandler("set-live-substitute-off", (params) =>
        setOutPlayerId((params as { playerId: PlayerId }).playerId),
      ),
      registerActionHandler("set-live-substitute-in", (params) =>
        setInPlayerId((params as { playerId: PlayerId }).playerId),
      ),
    ];
    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [onApplyTactics, onBringOff, onMakeSubstitution, onDecisionResolved, tactic]);

  // Publish the panel's open/closed state to the spine (match-day keyboard
  // note): while open it is a soft overlay layer — bare keys beneath it are
  // suppressed so panel controls are keyboard-reachable only while the panel
  // is open. The panel's own modal keys below are registered through the seam,
  // exactly like the palette/help overlays own their Escape.
  useEffect(() => {
    setScopeState({ matchPanelOpen: open });
    return () => clearScopeState("matchPanelOpen");
  }, [open]);

  // The panel is topmost only when no palette/help/splash is open above it —
  // Escape always closes exactly the topmost transient layer (AC-20).
  const isPanelTopmost = (): boolean => {
    const upper = getScopeState().spineOverlayLayer;
    return upper === undefined || upper === "none";
  };

  const abortSubDraft = (): void => {
    const hadDraft = panelRef.current.subDraftStarted;
    setOutPlayerId(PlayerId.make(""));
    setInPlayerId(PlayerId.make(""));
    if (hadDraft) setSubAlert(null);
  };

  // Panel-scoped Escape (AC-33): open → close the panel (and the injury modal
  // inside it); paused → the match STAYS paused (the pause is owned by the
  // screen's chunkInjuries, untouched here); closed → no-op. A palette/help/
  // splash above the panel owns Escape instead.
  useSeamHotkeys(
    "Escape",
    (event) => {
      if (!panelRef.current.open) return;
      if (!isPanelTopmost()) return;
      event.preventDefault();
      abortSubDraft();
      setOpen(false);
      // Never leave focus on document.body: hand it back to the toggle button.
      toggleRef.current?.focus();
    },
    { enableOnFormTags: true },
  );

  // Panel-scoped Enter (AC-33): the injury decision modal's Play On, otherwise
  // the completed two-step substitution's confirm. Enter activates the focused
  // control and nothing else (AC-19): when the focus target natively consumes
  // Enter (a button, link, checkbox), the native activation wins.
  useSeamHotkeys(
    "Enter",
    (event) => {
      if (!panelRef.current.open || !isPanelTopmost()) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('button, a, input[type="checkbox"], [role="button"]') !== null
      ) {
        return;
      }
      event.preventDefault();
      if (panelRef.current.injuryDecisionPrompt) {
        void dispatchAction("play-on");
        return;
      }
      if (panelRef.current.subDraftComplete) {
        void dispatchAction("make-substitution");
      }
    },
    { enableOnFormTags: true },
  );

  // Panel-scoped B → Bring Off (AC-33), live only while the no-subs decision
  // modal is showing. Bare letters are never stolen from a text-entry control
  // (type-ahead in the substitution selects stays native).
  useSeamHotkeys(
    "b",
    (event) => {
      if (!panelRef.current.open || !isPanelTopmost()) return;
      if (isTextEntryTarget(event.target)) return;
      if (!panelRef.current.injuryDecisionPrompt) return;
      event.preventDefault();
      void dispatchAction("bring-off");
    },
    { enableOnFormTags: true },
  );

  if (!tactic) return null;

  const value: MatchControlContextValue = {
    state: {
      open,
      squad,
      tactic,
      outPlayerId,
      inPlayerId,
      isHalftime,
      status,
      subAlert,
      subsStatus,
      onPitchCount,
      injuryPrompt,
      hasRedInjury,
      orangeInjury,
      isShorthanded,
      injuryDecisionPrompt,
      subDraftComplete,
    },
    actions: {
      setIsHalftime,
    },
    meta: {
      toggleRef,
    },
  };

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
                  onChange={(event) => setIsHalftime(event.target.checked)}
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