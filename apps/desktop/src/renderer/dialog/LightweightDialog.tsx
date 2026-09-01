import { useRef } from "react";
import { Button } from "../components/ui/button.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "../theme.js";

export interface LightweightDialogProps {
  readonly title: string;
  readonly description?: string;
  readonly onSubmitLabel?: string;
  readonly onCancel: () => void;
  readonly onSubmit?: () => void;
}

export const LightweightDialog = ({
  title,
  description,
  onSubmitLabel = "OK",
  onCancel,
  onSubmit,
}: LightweightDialogProps) => {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div
      className={MODAL_SCRIM}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={MODAL_COMPACT}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        {/* The shared modal anatomy: chrome-gradient title band over a
            strong-panel body, per the `MODAL_*` constants in theme.ts. */}
        <div className={MODAL_TITLE_BAND}>
          <h2 className="font-semibold">{title}</h2>
        </div>
        <div className={MODAL_BODY}>
          {description !== undefined && (
            <p className="mt-1 text-sm text-text-secondary">{description}</p>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button ref={buttonRef} type="button" variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
            {onSubmit && (
              <Button type="button" onClick={onSubmit}>
                {onSubmitLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};