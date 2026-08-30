/**
 * Inline modal dialog (screen-keyboard-tiers note: the native `prompt()` in the
 * counter-offer path is replaced with an inline modal — text input + OK/Cancel,
 * focus taken on open and returned on close, Tab trapped while open, Enter to
 * submit, Escape cancels — reusable across screens). Level-4 mindset applies:
 * the modal owns the keyboard the moment it opens, and never leaks focus to
 * `document.body` while open.
 */
import { useRef } from "react";
import { FOCUS_RING } from "../focus.js";
import { useDialogKeyboard } from "./dialogKeyboard.js";

export interface InlineModalProps {
  readonly title: string;
  readonly description?: string;
  /** The submit label (e.g. "Counter"). */
  readonly submitLabel: string;
  readonly inputLabel: string;
  readonly amountValue: string;
  readonly onAmountChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

export const InlineModal = ({
  title,
  description,
  submitLabel,
  inputLabel,
  amountValue,
  onAmountChange,
  onSubmit,
  onCancel,
}: InlineModalProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Give the modal the keyboard on open (initial focus into the input) and
  // return it to the invoking control on close; Tab is trapped inside.
  const { containerRef, onKeyDown } = useDialogKeyboard({
    initialFocus: () => inputRef.current,
    onEscape: () => {
      onCancel();
    },
  });

  const onContainerKeyDown = (event: React.KeyboardEvent): void => {
    onKeyDown(event);
    if (event.defaultPrevented) return;
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onContainerKeyDown}
        className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-2xl"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        )}
        <label className="mt-3 block text-sm text-slate-300">
          {inputLabel}
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={amountValue}
            onChange={(event) => onAmountChange(event.target.value)}
            className={`mt-1 w-full rounded bg-slate-800 px-2 py-1 ${FOCUS_RING.join(" ")}`}
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className={`rounded bg-slate-700 px-3 py-1 text-sm ${FOCUS_RING.join(" ")}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`rounded bg-amber-600 px-3 py-1 text-sm text-slate-950 ${FOCUS_RING.join(" ")}`}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};