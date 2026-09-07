/**
 * The confirmation in front of leaving career creation once a world exists
 * (Screen 7 §21: Back must not silently discard a generated world).
 *
 * It is a renderer-side gate and nothing more — it neither performs the discard
 * nor knows how one is performed. Confirming hands back to the same departure
 * path the flow has always used; declining leaves the session exactly as it
 * was, which is why nothing here touches it.
 */
import { useEffect, useRef } from "react";
import { Button } from "../components/ui/button.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "../theme.js";
import { selectedClubOf } from "./clubSelection.js";
import type { CreationSession } from "../router/createSessionContext.js";

const DISCARD_DIALOG_TITLE = "Discard this career?";

/**
 * What the player is told they are about to lose, named rather than implied. A
 * world still being built is described as such — the player waited for it, and
 * saying "generated" of a job still in flight would be a small lie.
 */
const describeDiscard = (session: CreationSession): string => {
  const world =
    session.generation._tag === "Running"
      ? "The world being built"
      : "The world that was built";
  const club = selectedClubOf(session);
  const kept = [
    session.saveName.trim().length > 0 ? "your career details" : null,
    club === null ? null : `your pick of ${club.clubName}`,
  ].filter((part): part is string => part !== null);

  return kept.length === 0
    ? `${world} for this career will be discarded.`
    : `${world}, along with ${kept.join(" and ")}, will be discarded.`;
};

export interface DiscardCareerDialogProps {
  readonly session: CreationSession;
  /** Stay in creation, on the step the player asked to leave from. */
  readonly onKeep: () => void;
  /** Discard the provisional world and leave. */
  readonly onDiscard: () => void;
}

export const DiscardCareerDialog = ({
  session,
  onKeep,
  onDiscard,
}: DiscardCareerDialogProps) => {
  // The control that opened the dialog gets focus back when it closes, whichever
  // way it closed — the bar's Cancel is still there to be pressed again, and a
  // player who declines should not be dropped at the top of the document.
  //
  // Captured during the first render rather than in the mount effect: by the
  // time effects run, the dialog's own `autoFocus` has already moved focus, so
  // an effect would record the Keep button and restore focus to a node that no
  // longer exists.
  const openerRef = useRef<Element | null>(null);
  openerRef.current ??= document.activeElement;

  useEffect(
    () => () => {
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      }
    },
    [],
  );

  return (
    <div
      className={MODAL_SCRIM}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onKeep();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={DISCARD_DIALOG_TITLE}
        className={MODAL_COMPACT}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onKeep();
          }
        }}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">{DISCARD_DIALOG_TITLE}</h2>
        </div>
        <div className={MODAL_BODY}>
          <p className="text-sm text-text-secondary">{describeDiscard(session)}</p>
          {/* Focus opens on staying: the destructive choice is never the one a
              stray Enter takes. */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" autoFocus onClick={onKeep}>
              Keep Editing
            </Button>
            <Button type="button" variant="destructive" onClick={onDiscard}>
              Discard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
