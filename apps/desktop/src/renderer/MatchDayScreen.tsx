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
import { FOCUS_RING } from "./focus.js";
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
}) => (
  <div>
    <p className="text-xs text-slate-400">{label}</p>
    <div className="mt-1 flex gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          data-action-id={actionId}
          className={`rounded px-2 py-0.5 text-xs capitalize ${FOCUS_RING.join(" ")} ${
            option === value ? "bg-slate-100 text-slate-900" : "bg-slate-800 hover:bg-slate-700"
          }`}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

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

  const tacticsResult = useAtomValue(tacticsAtom(saveId));
  const runCommand = useAtomSet(submitMatchCommandMutation, { mode: "promise" });

  const injuryPrompt = injuries.some((injury) => injury.teamClubId === homeClubId);
  const hasRedInjury = injuries.some((injury) => injury.teamClubId === homeClubId && injury.tier === "red");
  const orangeInjury = injuries.find((injury) => injury.teamClubId === homeClubId && injury.tier === "orange");
  const isShorthanded = onPitchCount < 11;

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
    if (!tactic || !outPlayerId || !inPlayerId || outPlayerId === inPlayerId) return;
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

  if (!tactic) return null;

  const onPitchIds = new Set(tactic.slots.map((slot: TacticSlot) => slot.playerId));
  const bench = squad.filter((player) => !onPitchIds.has(player.id));
  const fullNameOf = (id: string) => {
    const player = squad.find((p) => p.id === id);
    return player ? `${player.firstName} ${player.lastName}` : id;
  };

  return (
    <section className="mt-4 rounded border border-slate-800 bg-slate-900">
      <button
        type="button"
        data-action-id="toggle-control-panel"
        className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold ${FOCUS_RING.join(" ")}`}
        onClick={() => void dispatchAction("toggle-control-panel")}
      >
        <span>
          Tactics &amp; substitutions
          {injuryPrompt && (
            <span
              className={`ml-2 rounded px-2 py-0.5 text-xs ${
                hasRedInjury ? "bg-red-700" : "bg-amber-700"
              }`}
            >
              {hasRedInjury ? "Severe injury — must re-sub" : "Knock — sub or play on"}
            </span>
          )}
        </span>
        <span className="text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-800 p-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">
              Substitutions used: {subsStatus.used}/5 · Windows used: {subsStatus.windowsUsed}/3
              {subsStatus.capReached && <span className="ml-2 text-red-400">Cap reached</span>}
            </p>
          </div>

          {isShorthanded && (
            <div className="rounded border border-red-800 bg-red-950/40 p-3 text-xs">
              <p className="font-semibold text-red-300">Playing with {onPitchCount} men</p>
              <p className="mt-1 text-red-200">
                A player is off with no substitute left. Rearrange the remaining players in the
                tactics panel below to fill the formation before resuming.
              </p>
            </div>
          )}

          {orangeInjury && subsStatus.capReached && !isShorthanded && (
            <div className="rounded border border-amber-700 bg-amber-950/40 p-3 text-xs">
              <p className="font-semibold text-amber-300">
                {orangeInjury.playerId} has a knock and you&apos;ve no subs left.
              </p>
              <p className="mt-1 text-amber-200">
                Play on (crippled, at risk of escalation to red) or bring them off and play with 10.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  data-action-id="play-on"
                  className={`rounded bg-amber-700 px-3 py-1 text-xs hover:bg-amber-600 ${FOCUS_RING.join(" ")}`}
                  onClick={() => void dispatchAction("play-on")}
                >
                  Play on
                </button>
                <button
                  type="button"
                  data-action-id="bring-off"
                  className={`rounded bg-red-700 px-3 py-1 text-xs hover:bg-red-600 ${FOCUS_RING.join(" ")}`}
                  onClick={() => void dispatchAction("bring-off")}
                >
                  Bring off (10 men)
                </button>
              </div>
            </div>
          )}

          {hasRedInjury && !isShorthanded && (
            <div className="rounded border border-red-700 bg-red-950/40 p-3 text-xs">
              <p className="font-semibold text-red-300">A severe injury has forced a player off.</p>
              <p className="mt-1 text-red-200">
                No subs left — rearrange the remaining players in the tactics panel below.
              </p>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={isHalftime}
                onChange={(event) => setIsHalftime(event.target.checked)}
              />
              Apply as a halftime instruction (doesn't consume a substitution window)
            </label>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Team instructions</p>
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
            <p className="mt-1 text-xs text-slate-500">
              Formation stays {tactic.formation as Formation} live — use the pre-match Tactics screen to
              redraft slots.
            </p>
            <button
              type="button"
              data-action-id="apply-live-tactics"
              className={`mt-2 rounded bg-slate-700 px-3 py-1 text-xs hover:bg-slate-600 ${FOCUS_RING.join(" ")}`}
              onClick={() => void dispatchAction("apply-live-tactics")}
            >
              Apply tactics change
            </button>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold text-slate-300">Make a substitution</p>
            <div className="flex items-end gap-2">
              <div>
                <p className="text-xs text-slate-400">Off</p>
                <select
                  data-action-id="set-live-substitute-off"
                  className={`rounded bg-slate-800 px-2 py-1 ${FOCUS_RING.join(" ")}`}
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
                <p className="text-xs text-slate-400">On</p>
                <select
                  data-action-id="set-live-substitute-in"
                  className={`rounded bg-slate-800 px-2 py-1 ${FOCUS_RING.join(" ")}`}
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
              <button
                type="button"
                data-action-id="make-substitution"
                disabled={subsStatus.capReached || !outPlayerId || !inPlayerId}
                className={`rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
                onClick={() => void dispatchAction("make-substitution")}
              >
                Make substitution
              </button>
            </div>
          </div>

          {status && <p className="text-xs text-slate-500">{status}</p>}
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
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Match day</h1>
      {error && <p className="mt-2 text-red-400">{error}</p>}

      {!match && (
        <section className="mt-6 flex items-end gap-2">
          <div>
            <p className="text-sm text-slate-400">Opponent</p>
            <select
              className="mt-1 rounded bg-slate-800 px-2 py-1"
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
          <button
            type="button"
            data-action-id="start-match"
            disabled={!opponentId || starting}
            className={`rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50 ${FOCUS_RING.join(" ")}`}
            onClick={() => void dispatchAction("start-match")}
          >
            {starting ? "Starting..." : "Start match"}
          </button>
        </section>
      )}

      {match && (
        <section className="mt-6">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold">
              {match.homeClubName} {homeScore} - {awayScore} {match.awayClubName}
            </h2>
            <span className="text-sm text-slate-400">
              {isComplete ? "Full time" : paused ? "Paused — awaiting decision" : "Live"}
            </span>
          </div>

          <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-900 p-4 text-sm">
            {revealed.map((line, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-10 shrink-0 text-slate-500">{line.minute}&apos;</span>
                <span>{line.text}</span>
              </li>
            ))}
            {revealed.length === 0 && <li className="text-slate-500">Kick-off is coming up...</li>}
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
              <button
                type="button"
                data-action-id="reset-match"
                className={`rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 ${FOCUS_RING.join(" ")}`}
                onClick={() => void dispatchAction("reset-match")}
              >
                Back to opponent picker
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};