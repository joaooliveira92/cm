import { useRef } from "react";
import { Button } from "../components/ui/button.js";

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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-panel border border-panel-border bg-panel-bg-strong p-3 text-text-primary shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
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
  );
};