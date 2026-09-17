import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../components/ui/button.js";
import { useDialogKeyboard } from "../transfers/dialogKeyboard.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM_TOP, MODAL_TITLE_BAND } from "../theme.js";

const QUIT_BODY = "Are you sure you want to close cm-clone?";

export const QuitGuard = () => {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  const onCancel = useCallback(() => {
    window.electronAPI.cancelQuit();
    setOpen(false);
  }, []);

  const onConfirm = useCallback(() => {
    window.electronAPI.confirmQuit();
  }, []);

  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => cancelRef.current,
    onEscape: onCancel,
  });

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("show-quit-guard", handler);
    return () => window.removeEventListener("show-quit-guard", handler);
  }, []);

  if (!open) return null;

  const dialog = (
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
        aria-label="Quit"
        onKeyDown={onKeyDown}
        className={MODAL_COMPACT}
      >
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">Quit</h2>
        </div>
        <div className={MODAL_BODY}>
          <p className="text-sm text-text-body">{QUIT_BODY}</p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button ref={cancelRef} type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={onConfirm}>
              Quit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};
