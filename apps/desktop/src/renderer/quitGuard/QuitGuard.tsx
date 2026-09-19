import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Button } from "../components/ui/button.js";
import { useDialogKeyboard } from "../transfers/dialogKeyboard.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM_TOP, MODAL_TITLE_BAND } from "../theme.js";
import {
  getProvisionalCareer,
  subscribeProvisionalCareer,
  type ProvisionalCareer,
} from "../create/provisionalCareer.js";

const QUIT_TITLE = "Quit";
const QUIT_BODY = "Are you sure you want to close cm-clone?";

/**
 * Quitting mid-creation is a different question, so it gets a different dialog.
 *
 * The generic copy is not merely unhelpful here, it asks the player to confirm the wrong thing:
 * that the app will close, saying nothing of the world they waited for dying with it. Two distinct
 * actions rather than one Quit, for the same reason — a "Quit" that also deletes something is one
 * label over two decisions.
 *
 * The shape is `DiscardCareerDialog`'s, deliberately. Leaving creation by navigating and leaving it
 * by quitting are the same loss, and a player who has seen one should recognise the other.
 */
const PROVISIONAL_TITLE = "Discard this career and quit?";
const PROVISIONAL_BODY =
  "Your incomplete career creation will be lost. The world that was built for it will be discarded.";

interface QuitDialogProps {
  readonly provisional: ProvisionalCareer;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/**
 * A separate component so it *mounts* when the dialog opens.
 *
 * `useDialogKeyboard` takes the keyboard in a mount effect. While this lived in `QuitGuard`, which
 * stays mounted for the life of the app and returned `null` until asked, that effect ran once at
 * startup with no dialog on screen and nothing to focus — so the quit dialog opened with focus
 * wherever it happened to be, and never handed it back on close. Both are the hook's contract, and
 * both start working once its lifetime is the dialog's rather than the guard's.
 */
const QuitDialog = ({ provisional, onCancel, onConfirm }: QuitDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => cancelRef.current,
    onEscape: onCancel,
  });

  const title = provisional.present ? PROVISIONAL_TITLE : QUIT_TITLE;

  return (
    <div
      className={MODAL_SCRIM_TOP}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onKeyDown}
        className={MODAL_COMPACT}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <div className={MODAL_BODY}>
          <p className="text-sm text-text-body">
            {provisional.present ? PROVISIONAL_BODY : QUIT_BODY}
          </p>
          {/* Focus opens on staying, in both variants: the destructive choice is never the one a
              stray Enter takes. */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>
              {provisional.present ? "Continue Creating" : "Cancel"}
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm}>
              {provisional.present ? "Discard & Quit" : "Quit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const QuitGuard = () => {
  const [open, setOpen] = useState(false);
  const provisional = useSyncExternalStore(subscribeProvisionalCareer, getProvisionalCareer);

  const onCancel = useCallback(() => {
    window.electronAPI.cancelQuit();
    setOpen(false);
  }, []);

  const onConfirm = useCallback(() => {
    // The id travels with the confirmation rather than being acted on here. A renderer-side
    // `discardCareer` would be an in-flight call racing `app.quit()`, and losing that race orphans
    // the very world this dialog promised to remove. Main owns the exit, so main takes the delete.
    window.electronAPI.confirmQuit(provisional.id ?? undefined);
  }, [provisional.id]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("show-quit-guard", handler);
    return () => window.removeEventListener("show-quit-guard", handler);
  }, []);

  if (!open) return null;

  return createPortal(
    <QuitDialog provisional={provisional} onCancel={onCancel} onConfirm={onConfirm} />,
    document.body,
  );
};
