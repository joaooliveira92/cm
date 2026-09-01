import { useEffect, useRef, useState } from "react";
import {
  ClubId,
  PlayerId,
  Tactic,
  type ClubSummary,
  type CommentaryLineView,
  type InjuryView,
  type MatchId,
  type MatchSummary,
  type SaveId,
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
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { clearScopeState, getScopeState, setScopeState } from "./actions/scopeState.js";
import { Alert } from "./components/ui/alert.js";
import { Badge } from "./components/ui/badge.js";
import { Button } from "./components/ui/button.js";
import { FOCUS_RING } from "./focus.js";
import { useSeamHotkeys } from "./hotkeys.js";
import { isTextEntryTarget } from "./keymap/keystroke.js";
import {
  substitutionErrorLabel,
  validateLiveSubstitution,
} from "./match/substitution.js";
import { Effect, Result } from "effect";
import {
  REVEAL_INTERVAL_MS,
  POLL_INTERVAL_MS,
  REFETCH_THRESHOLD,
  listOpponentClubs,
  resumeSimulation,
  startMatch,
  submitMatchCommandMutation,
  tacticsAtom,
  useAtomSet,
  useAtomValue,
  type RpcClientError,
} from "./rpc.js";
import {
  clearActiveMatch,
  getActiveMatch,
  setActiveMatch,
} from "./match/session.js";

const NO_SUBS: SubstitutionStatusView = {
  used: 0,
  remaining: 5,
  windowsUsed: 0,
  windowsRemaining: 3,
  capReached: false,
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

/** Live tactics/substitution control (ticket 14) — a collapsible panel reachable without leaving
 * the Match day screen. Reuses `TacticsScreen.tsx`'s formation/instruction-slider patterns but
 * only supports Team Instruction tweaks live (not a full re-draft of every slot's Position/Role),
 * which is enough to construct a valid `Tactic` for `ChangeTactics`. Substitutions are constrained
 * to the club's current on-pitch XI (tracked locally from the loaded Tactic + accepted subs) and
 * the 5-sub/3-window cap reported by the server on every poll.
 */
const MatchControlPanel = ({
  saveId,
  matchId,
  homeClubId,
  cursor,
  subsStatus,
  onPitchCount,
  injuries,
  currentMinute,
  onApplied,
  onDecisionResolved,
}: {
  readonly saveId: SaveId;
  readonly matchId: MatchId;
  readonly homeClubId: ClubId;
  readonly cursor: number;
  readonly subsStatus: SubstitutionStatusView;
  readonly onPitchCount: number;
  readonly injuries: ReadonlyArray<InjuryView>;
  readonly currentMinute: number;
  readonly onApplied: (response: {
    readonly cursor: number;
    readonly lines: ReadonlyArray<CommentaryLineView>;
    readonly isComplete: boolean;
    readonly homeScore: number;
    readonly awayScore: number;
    readonly homeSubs: SubstitutionStatusView;
    readonly awaySubs: SubstitutionStatusView;
    readonly homeOnPitchCount: number;
    readonly awayOnPitchCount: number;
  }) => void;
  /** Acknowledge a pending no-subs decision without issuing a command (orange "play on" keeps the
   * crippled player on) so the paused match resumes. */
  readonly onDecisionResolved: () => void;
}) => {
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
  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const injuryPrompt = injuries.some((injury) => injury.teamClubId === homeClubId);
  const hasRedInjury = injuries.some((injury) => injury.teamClubId === homeClubId && injury.tier === "red");
  const orangeInjury = injuries.find((injury) => injury.teamClubId === homeClubId && injury.tier === "orange");
  const isShorthanded = onPitchCount < 11;
  /** The no-subs knock decision modal: orange injury + cap reached + 11 on pitch. */
  const injuryDecisionPrompt = orangeInjury !== undefined && subsStatus.capReached && !isShorthanded;
  /** The two-step substitution draft is complete enough to confirm (Enter). */
  const subDraftComplete =
    !subsStatus.capReached && outPlayerId !== "" && inPlayerId !== "";

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

  const submit = async (
    command:
      | { readonly _tag: "ChangeTactics"; readonly clubId: ClubId; readonly tactic: Tactic }
      | {
          readonly _tag: "MakeSubstitution";
          readonly clubId: ClubId;
          readonly outPlayerId: PlayerId;
          readonly inPlayerId: PlayerId;
        }
      | { readonly _tag: "ForceOff"; readonly clubId: ClubId; readonly playerId: PlayerId },
  ) => {
    setStatus("Submitting...");
    try {
      const result = await runCommand({
        saveId,
        matchId,
        cursor,
        minute: isHalftime ? 45 : Math.max(1, currentMinute),
        isHalftime,
        command,
      });
      onApplied(result);
      setStatus("Applied — the engine may still reject an invalid/over-cap command silently.");
    } catch (error) {
      const typed = error as RpcClientError<"submitMatchCommand"> | undefined;
      if (typed?._tag === "RemoteFailure") {
        setStatus("Applied — the engine may still reject an invalid/over-cap command silently.");
      } else {
        setStatus("Failed to submit command");
      }
    }
  };

  const onApplyTactics = () => {
    if (!tactic) return;
    void submit({ _tag: "ChangeTactics", clubId: homeClubId, tactic });
  };

  // Ticket 11 orange no-subs bring-off: the manager drags the injured player off to 10 men.
  const onBringOff = () => {
    if (!orangeInjury) return;
    void submit({ _tag: "ForceOff", clubId: homeClubId, playerId: orangeInjury.playerId });
  };

  const onMakeSubstitution = async () => {
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
    await submit({ _tag: "MakeSubstitution", clubId: homeClubId, outPlayerId, inPlayerId });
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

  // Register the live Match Day control-panel operations so buttons and the key
  // map both dispatch the same registered Actions (ADR-0012). Decided before the
  // early return so hook order never depends on whether the tactic has loaded.
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

  const onPitchIds = new Set(tactic.slots.map((slot: TacticSlot) => slot.playerId));
  const bench = squad.filter((player) => !onPitchIds.has(player.id));
  const fullNameOf = (id: string) => {
    const player = squad.find((p) => p.id === id);
    return player ? `${player.firstName} ${player.lastName}` : id;
  };

  return (
    <section className="mt-4 rounded-panel border border-panel-border bg-panel-bg shadow-panel">
      <button
        type="button"
        ref={toggleRef}
        data-action-id="toggle-control-panel"
        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold ${FOCUS_RING.join(" ")}`}
        onClick={() => void dispatchAction("toggle-control-panel")}
      >
        <span>
          Tactics &amp; substitutions
          {injuryPrompt && (
            <Badge className="ml-2" variant={hasRedInjury ? "destructive" : "warning"}>
              {hasRedInjury ? "Severe injury — must re-sub" : "Knock — sub or play on"}
            </Badge>
          )}
        </span>
        <span className="text-text-secondary">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-border-subtle p-4 text-sm">
          <div>
            <p className="text-xs text-text-secondary">
              Substitutions used: {subsStatus.used}/5 · Windows used: {subsStatus.windowsUsed}/3
              {subsStatus.capReached && <span className="ml-2 text-destructive">Cap reached</span>}
            </p>
          </div>

          {isShorthanded && (
            <Alert variant="destructive">
              <p className="font-semibold">Playing with {onPitchCount} men</p>
              <p className="mt-1">
                A player is off with no substitute left. Rearrange the remaining players in the
                tactics panel below to fill the formation before resuming.
              </p>
            </Alert>
          )}

          {orangeInjury && subsStatus.capReached && !isShorthanded && (
            <Alert className="border-text-warning/40 bg-text-warning/10 text-text-warning">
              <p className="font-semibold">
                {orangeInjury.playerId} has a knock and you&apos;ve no subs left.
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
          )}

          {hasRedInjury && !isShorthanded && (
            <Alert variant="destructive">
              <p className="font-semibold">A severe injury has forced a player off.</p>
              <p className="mt-1">
                No subs left — rearrange the remaining players in the tactics panel below.
              </p>
            </Alert>
          )}

          <div>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={isHalftime}
                onChange={(event) => setIsHalftime(event.target.checked)}
              />
              Apply as a halftime instruction (doesn't consume a substitution window)
            </label>
          </div>

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

          <div>
            <p className="mb-1 text-xs font-semibold text-text-body">Make a substitution</p>
            <div className="flex items-end gap-2">
              <div>
                <p className="text-xs text-text-secondary">Off</p>
                <select
                  data-action-id="set-live-substitute-off"
                  className={SELECT_CLASS}
                  value={outPlayerId}
                  onChange={(event) =>
                    void dispatchAction("set-live-substitute-off", {
                      playerId: PlayerId.make(event.target.value),
                    })
                  }
                  disabled={subsStatus.capReached}
                >
                  <option value="">Select player</option>
                  {tactic.slots.map((slot: TacticSlot) => (
                    <option key={slot.playerId} value={slot.playerId}>
                      {fullNameOf(slot.playerId)} ({slot.position})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-text-secondary">On</p>
                <select
                  data-action-id="set-live-substitute-in"
                  className={SELECT_CLASS}
                  value={inPlayerId}
                  onChange={(event) =>
                    void dispatchAction("set-live-substitute-in", {
                      playerId: PlayerId.make(event.target.value),
                    })
                  }
                  disabled={subsStatus.capReached}
                >
                  <option value="">Select player</option>
                  {bench.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.firstName} {player.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="secondary"
                data-action-id="make-substitution"
                disabled={subsStatus.capReached || !outPlayerId || !inPlayerId}
                onClick={() => void dispatchAction("make-substitution")}
              >
                Make substitution
              </Button>
            </div>
            {subAlert && (
              <p role="alert" className="mt-1 text-xs text-text-warning">
                {subAlert}
              </p>
            )}
          </div>

          {status && <p className="text-xs text-text-muted">{status}</p>}
        </div>
      )}
    </section>
  );
};

export const MatchDayScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [opponents, setOpponents] = useState<ReadonlyArray<ClubSummary>>([]);
  const [opponentId, setOpponentId] = useState(ClubId.make(""));
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [homeSubs, setHomeSubs] = useState<SubstitutionStatusView>(NO_SUBS);
  const [homeOnPitchCount, setHomeOnPitchCount] = useState(11);
  const [chunkInjuries, setChunkInjuries] = useState<ReadonlyArray<InjuryView>>([]);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [paused, setPaused] = useState(false);

  // Mutable cursor/pacing/polling state that doesn't need to trigger re-renders on its own.
  const cursorRef = useRef(0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    // Arrive at an in-flight match, don't start one on mount (router note
    // AC-16): when a session was recorded for this save, restore the UI from
    // it instead of showing the opponent picker.
    const resumed = getActiveMatch(saveId);
    if (resumed !== null) {
      setMatch(resumed.match);
      setRevealed(resumed.revealed);
      setHomeScore(resumed.homeScore);
      setAwayScore(resumed.awayScore);
      setIsComplete(resumed.isComplete);
      setHomeSubs(resumed.homeSubs);
      setHomeOnPitchCount(resumed.homeOnPitchCount);
      setChunkInjuries(resumed.chunkInjuries);
      setCurrentMinute(resumed.currentMinute);
      cursorRef.current = resumed.cursor;
      pendingRef.current = [];
      streamCompleteRef.current = resumed.streamComplete;
      return;
    }
    const load = async () => {
      const outcome = await Effect.runPromise(listOpponentClubs(saveId).pipe(Effect.result));
      if (Result.isFailure(outcome)) {
        setError("Failed to load opponents");
        return;
      }
      const clubs = outcome.success;
      setOpponents(clubs);
      if (clubs.length > 0) setOpponentId(clubs[0]!.id);
    };
    void load();
  }, [saveId]);

  // Record the in-flight match so a later route arrival resumes, not restarts.
  useEffect(() => {
    if (match === null) return;
    setActiveMatch({
      saveId,
      match,
      cursor: cursorRef.current,
      revealed,
      homeScore,
      awayScore,
      isComplete,
      homeSubs,
      homeOnPitchCount,
      chunkInjuries,
      currentMinute,
      streamComplete: streamCompleteRef.current,
    });
  }, [
    saveId,
    match,
    revealed,
    homeScore,
    awayScore,
    isComplete,
    homeSubs,
    homeOnPitchCount,
    chunkInjuries,
    currentMinute,
  ]);

  // A finished match is no longer "pending": forget the resume session.
  useEffect(() => {
    if (isComplete) clearActiveMatch(saveId);
  }, [isComplete, saveId]);

  const onStartMatch = async () => {
    if (!opponentId) return;
    setError(null);
    setStarting(true);
    setRevealed([]);
    setHomeScore(0);
    setAwayScore(0);
    setIsComplete(false);
    setHomeSubs(NO_SUBS);
    setHomeOnPitchCount(11);
    setChunkInjuries([]);
    setCurrentMinute(0);
    setPaused(false);
    cursorRef.current = 0;
    pendingRef.current = [];
    streamCompleteRef.current = false;
    pausedRef.current = false;
    const outcome = await Effect.runPromise(startMatch({ saveId, opponentClubId: opponentId }).pipe(Effect.result));
    if (Result.isFailure(outcome)) {
      setError("Failed to start match");
      setStarting(false);
      return;
    }
    setMatch(outcome.success);
    setStarting(false);
  };

  // Register the Match Day screen's operation handlers (start + reset) so buttons
  // and the key map dispatch the same registered Actions (ADR-0012).
  useEffect(() => {
    const unregister = registerActionHandler("start-match", () => {
      void onStartMatch();
    });
    const unregisterReset = registerActionHandler("reset-match", () => setMatch(null));
    return () => {
      unregister();
      unregisterReset();
    };
  }, [saveId, onStartMatch]);

  // Drives successive ResumeSimulation calls (ticket 13) — no RPC streaming, just polling ahead of
  // the local reveal pace and buffering whatever comes back.
  useEffect(() => {
    if (!match) return;

    const poll = async () => {
      if (fetchingRef.current || streamCompleteRef.current) return;
      // Ticket 11 hard-pause: with a no-subs injury decision pending for the player's club, hold the
      // feed here until the manager resolves it (play-on / bring-off / rearrange), instead of
      // buffering past the moment the match would have stopped for the decision.
      if (pausedRef.current) return;
      if (pendingRef.current.length > REFETCH_THRESHOLD) return;
      fetchingRef.current = true;
      try {
        const outcome = await Effect.runPromise(
          resumeSimulation({
            saveId,
            matchId: match.matchId,
            cursor: cursorRef.current,
          }).pipe(Effect.result),
        );
        if (Result.isFailure(outcome)) {
          setError("Failed to resume match simulation");
          streamCompleteRef.current = true;
          return;
        }
      } catch {
        setError("Failed to resume match simulation");
        streamCompleteRef.current = true;
      } finally {
        fetchingRef.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // `match` and `saveId` bound the polling loop; the refs are intentionally excluded.
  }, [match, saveId]);

  // Drive the pause (ticket 11): a no-subs injury decision for the player's own club halts reveal
  // and polling until the manager acts. Cleared when the injury is acknowledged or resolved.
  useEffect(() => {
    if (!match) return;
    const needsDecision =
      chunkInjuries.some((injury) => injury.teamClubId === match.homeClubId) && homeSubs.capReached;
    pausedRef.current = needsDecision;
    setPaused(needsDecision);
  }, [match, chunkInjuries, homeSubs.capReached]);

  // Paces the feed: reveals one already-fetched Commentary Line at a time.
  useEffect(() => {
    if (!match) return;

    const interval = setInterval(() => {
      if (pausedRef.current) return;
      const next = pendingRef.current.shift();
      if (next) {
        setRevealed((lines) => [...lines, next]);
        setCurrentMinute(next.minute);
      } else if (streamCompleteRef.current) {
        setIsComplete(true);
      }
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match]);

  // A command submitted through the panel resimulates the whole match server-side; resync local
  // pacing state to whatever it returns rather than let the stale pre-command queue keep draining
  // (the prefix before the command's minute is unchanged by determinism, but anything from that
  // minute on may now differ).
  const onCommandApplied = (response: {
    readonly cursor: number;
    readonly lines: ReadonlyArray<CommentaryLineView>;
    readonly isComplete: boolean;
    readonly homeScore: number;
    readonly awayScore: number;
    readonly homeSubs: SubstitutionStatusView;
    readonly awaySubs: SubstitutionStatusView;
    readonly homeOnPitchCount: number;
    readonly awayOnPitchCount: number;
  }) => {
    cursorRef.current = response.cursor;
    pendingRef.current = [...response.lines];
    streamCompleteRef.current = response.isComplete;
    setHomeScore(response.homeScore);
    setAwayScore(response.awayScore);
    setHomeSubs(response.homeSubs);
    setHomeOnPitchCount(response.homeOnPitchCount);
    // The manager has seen the injury prompt and reacted (or not); clear it so a fresh injury in a
    // later chunk re-prompts.
    setChunkInjuries([]);
  };

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="text-2xl font-bold">Match day</h1>
      {error && <p className="mt-2 text-destructive">{error}</p>}

      {!match && (
        <section className="mt-6 flex items-end gap-2">
          <div>
            <p className="text-sm text-text-secondary">Opponent</p>
            <select
              className={`mt-1 ${SELECT_CLASS}`}
              value={opponentId}
              onChange={(event) => setOpponentId(ClubId.make(event.target.value))}
            >
              {opponents.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            data-action-id="start-match"
            disabled={!opponentId || starting}
            onClick={() => void dispatchAction("start-match")}
          >
            {starting ? "Starting..." : "Start match"}
          </Button>
        </section>
      )}

      {match && (
        <section className="mt-6">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold">
              {match.homeClubName} {homeScore} - {awayScore} {match.awayClubName}
            </h2>
            <span className="text-sm text-text-secondary">
              {isComplete ? "Full time" : paused ? "Paused — awaiting decision" : "Live"}
            </span>
          </div>

          <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto rounded-panel border border-panel-border bg-panel-bg p-4 text-sm shadow-panel">
            {revealed.map((line, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-10 shrink-0 tabular-nums text-text-muted">{line.minute}&apos;</span>
                <span>{line.text}</span>
              </li>
            ))}
            {revealed.length === 0 && <li className="text-text-muted">Kick-off is coming up...</li>}
          </ul>

          {!isComplete && (
            <MatchControlPanel
              saveId={saveId}
              matchId={match.matchId}
              homeClubId={match.homeClubId}
              cursor={cursorRef.current}
              subsStatus={homeSubs}
              onPitchCount={homeOnPitchCount}
              injuries={chunkInjuries}
              currentMinute={currentMinute}
              onApplied={onCommandApplied}
              onDecisionResolved={() => setChunkInjuries([])}
            />
          )}

          {isComplete && (
            <div className="mt-4 flex items-center gap-3">
              <p className="font-semibold">
                Final score: {match.homeClubName} {homeScore} - {awayScore} {match.awayClubName}
              </p>
              <Button
                type="button"
                variant="secondary"
                data-action-id="reset-match"
                onClick={() => void dispatchAction("reset-match")}
              >
                Back to opponent picker
              </Button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};

/** Native `<select>` paint. See the note in `table/TablePanel.tsx`. */
const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;
