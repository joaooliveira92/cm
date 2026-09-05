/**
 * The Match day live control panel's state: the panel's draft/open/flags/tactic
 * state, the derived `PanelMode`, the registered panel Actions, the panel-scoped
 * keyboard seams, and the soft-overlay `matchPanelOpen` scope state (AC-20).
 *
 * Returns `null` until the tactic has loaded — the provider renders nothing
 * until then, and every hook above has already run, so hook order never depends
 * on the load.
 */
import { useEffect, useRef, useState } from "react";
import {
  PlayerId,
  Tactic,
  type ClubId,
  type InjuryView,
  type SquadPlayerView,
  type SubstitutionStatusView,
  type TacticSlot,
} from "@cm-clone/contracts";
import type { Mentality, Pressing, Tempo } from "@cm-clone/shared";
import { dispatchAction, registerActionHandler } from "../actions/dispatch.js";
import { clearScopeState, getScopeState, setScopeState } from "../actions/scopeState.js";
import { useSeamHotkeys } from "../hotkeys.js";
import { isTextEntryTarget } from "../keymap/keystroke.js";
import { substitutionErrorLabel, validateLiveSubstitution } from "./substitution.js";
import { useMatchContext, type MatchCommand } from "./MatchProvider.js";
import { tacticsAtom, useAtomValue } from "../rpc.js";
import type { MatchControlContextValue, PanelMode } from "./matchControlContext.js";

export interface MatchControlInput {
  readonly homeClubId: ClubId;
  readonly subsStatus: SubstitutionStatusView;
  readonly onPitchCount: number;
  readonly injuries: ReadonlyArray<InjuryView>;
}

export const useMatchControl = ({
  homeClubId,
  subsStatus,
  onPitchCount,
  injuries,
}: MatchControlInput): MatchControlContextValue | null => {
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

  // Derived panel mode: one of closed, open, injury-prompt, injury-decision,
  // or sub-draft. Makes illegal state combinations unrepresentable.
  const computeMode = (): PanelMode => {
    if (!open) return { _tag: "closed" };
    if (orangeInjury !== undefined && subsStatus.capReached && !isShorthanded)
      return { _tag: "injury-decision" };
    if (!subsStatus.capReached && outPlayerId !== "" && inPlayerId !== "")
      return { _tag: "sub-draft" };
    if (hasRedInjury) return { _tag: "injury-prompt", severity: "red" };
    if (injuryPrompt) return { _tag: "injury-prompt", severity: "orange" };
    return { _tag: "open" };
  };
  const mode = computeMode();

  // The panel-scoped key handlers read a fresh snapshot each keystroke (the
  // seam keeps the functions themselves stable — no re-subscription churn).
  const panelRef = useRef({
    open,
    mode,
    subDraftStarted: outPlayerId !== "" || inPlayerId !== "",
  });
  panelRef.current = {
    open,
    mode,
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
      if (panelRef.current.mode._tag === "injury-decision") {
        void dispatchAction("play-on");
        return;
      }
      if (panelRef.current.mode._tag === "sub-draft") {
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
      if (panelRef.current.mode._tag !== "injury-decision") return;
      event.preventDefault();
      void dispatchAction("bring-off");
    },
    { enableOnFormTags: true },
  );


  if (tactic === null) return null;

  return {
    state: {
      open,
      squad,
      tactic,
      outPlayerId,
      inPlayerId,
      isHalftime,
      status,
      subAlert,
      mode,
      subsStatus,
      onPitchCount,
      injuryPrompt,
      hasRedInjury,
      orangeInjury,
      isShorthanded,
    },
    actions: {
      setIsHalftime,
    },
    meta: {
      toggleRef,
    },
  };
};
