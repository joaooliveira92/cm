import { useRef } from "react";
import { FOCUS_RING } from "../focus.js";

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
        className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          }
        }}
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            ref={buttonRef}
            type="button"
            className={`rounded bg-slate-700 px-3 py-1 text-sm ${FOCUS_RING.join(" ")}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          {onSubmit && (
            <button
              type="button"
              className={`rounded bg-amber-600 px-3 py-1 text-sm text-slate-950 ${FOCUS_RING.join(" ")}`}
              onClick={onSubmit}
            >
              {onSubmitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};