/**
 * Bid Composer compound leaf (ticket 15). Renders the contextual Actions region
 * (bid amount input, sign button, window-closed notice, bid alert) and the
 * dirty-draft Keep/Discard dialog — both reading from useTransfers(). It is the
 * only consumer of draftState.confirmDiscard and owns the dialog's keyboard
 * lifecycle (initial focus on Keep, Tab trapped, Escape keeps/closes).
 */
import { useRef } from "react";
import type { PlayerId } from "@cm-clone/contracts";
import { ACTION_REGISTRY } from "../actions/allActions.js";
import { dispatchAction } from "../actions/dispatch.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { ActionKeyBadge, actionBadgeBinding } from "../discoverability/ActionKeyBadge.js";
import { restoreFocusAfterOverlay } from "../focus.js";
import { useDialogKeyboard } from "./dialogKeyboard.js";
import { formatCredits } from "../table/transfers/marketColumns.js";
import { useTransfers } from "../TransfersProvider.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "../theme.js";
import { reduceBidDraft } from "../table/bidDraft.js";

const MARKET = "transfer-market";
const FREE = "free-agents";

const KeepDiscardDialog = ({
  playerName,
  onKeep,
  onDiscard,
}: {
  readonly playerName: string;
  readonly onKeep: () => void;
  readonly onDiscard: () => void;
}) => {
  const keepRef = useRef<HTMLButtonElement | null>(null);
  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => keepRef.current,
    onEscape: () => {
      onKeep();
    },
    restoreOnClose: false,
  });

  return (
    <div
      className={MODAL_SCRIM}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onKeep();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Discard the bid in progress?"
        onKeyDown={onKeyDown}
        className={MODAL_COMPACT}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">Discard the bid in progress?</h2>
        </div>
        <div className={MODAL_BODY}>
          <p className="text-sm text-text-secondary">
            You typed an amount for {playerName}. Moving away would lose this bid
            unless you keep it.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button ref={keepRef} type="button" variant="secondary" onClick={onKeep}>
              Keep bid
            </Button>
            <Button type="button" onClick={onDiscard}>
              Discard draft
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const BidComposer = () => {
  const { state, actions, meta } = useTransfers();
  const {
    draft,
    draftState,
    draftedPlayer,
    draftedPlayerName,
    draftAmount,
    draftAmountValid,
    bidAlert,
    windowOpen,
    marketRows,
  } = state;
  const { setSelected, setDraft } = actions;
  const { amountInputRef, draftRef, findPlayer } = meta;

  // Render the keep/discard dialog independently of the actions region
  // (confirmDiscard is reachable before draft is nulled on the discard path).
  if (draftState._tag === "confirmDiscard" && draftState.draft !== null) {
    return (
      <KeepDiscardDialog
        playerName={draftedPlayerName}
        onKeep={() => {
          setDraft(reduceBidDraft(draftRef.current, { _tag: "keepCurrent" }));
          const kept = findPlayer(draftState.draft!.playerId);
          setSelected(
            kept !== null
              ? {
                  tableId: marketRows.some((p) => p.id === kept.id) ? MARKET : FREE,
                  player: kept,
                }
              : null,
          );
          restoreFocusAfterOverlay();
        }}
        onDiscard={() => {
          setDraft(reduceBidDraft(draftRef.current, { _tag: "discardRequested" }));
          amountInputRef.current?.focus();
        }}
      />
    );
  }

  if (draft === null || draftedPlayer === null) return null;

  const focusBidAction = ACTION_REGISTRY.get("focus-bid");
  const bidBadge =
    focusBidAction !== undefined ? actionBadgeBinding(focusBidAction, "transfers") : null;

  return (
    <>
      {/* Contextual Actions region (AC-29): bid entry lives here, never in a row. */}
      <section
        className="mt-6 rounded-panel border border-panel-border bg-panel-bg p-3 shadow-panel"
        data-action-region="place-bid"
        aria-label="Place bid"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
          {draftedPlayer.clubName === null ? "Sign free agent" : "Place bid"}
          {bidBadge !== null && <ActionKeyBadge binding={bidBadge} />}
        </h2>
        <p className="mt-1 text-text-strong">
          Player: {draftedPlayer.firstName} {draftedPlayer.lastName}
        </p>
        <p className="text-sm text-text-secondary">
          Value: {formatCredits(draftedPlayer.transferValue)}
        </p>
        {draftedPlayer.clubName === null ? (
          <>
            <p className="mt-1 text-sm text-text-secondary">
              Free Agent &mdash; signable for Credits 0.
            </p>
            <Button
              type="button"
              className="mt-3"
              data-action-id="sign-free-agent"
              onClick={() => void dispatchAction("sign-free-agent", { playerId: draftedPlayer.id as PlayerId })}
            >
              Sign (0 Cr)
            </Button>
          </>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-sm text-text-body" htmlFor="bid-amount">
              Your bid:
            </label>
            <Input
              id="bid-amount"
              ref={amountInputRef}
              className="w-32"
              placeholder="Amount"
              value={draft.amountInput}
              onChange={(event) =>
                setDraft(reduceBidDraft(draftRef.current, { _tag: "amountChanged", value: event.target.value }))
              }
            />
            <Button
              type="button"
              data-action-id="place-bid"
              disabled={!windowOpen || !draftAmountValid}
              onClick={() =>
                void dispatchAction("place-bid", {
                  playerId: draftedPlayer.id as PlayerId,
                  amount: draftAmount,
                })
              }
            >
              Bid
            </Button>
          </div>
        )}
        {!windowOpen && (
          <p className="mt-2 text-sm text-text-muted">The transfer window is closed.</p>
        )}
        {bidAlert !== null && (
          <Alert variant="destructive" className="mt-2">
            {bidAlert}
          </Alert>
        )}
      </section>
    </>
  );
};
