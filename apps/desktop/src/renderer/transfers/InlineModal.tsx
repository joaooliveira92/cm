/**
 * Inline modal dialog (screen-keyboard-tiers note: the native `prompt()` in the
 * counter-offer path is replaced with an inline modal — text input + OK/Cancel,
 * focus taken on open and returned on close, Tab trapped while open, Enter to
 * submit, Escape cancels — reusable across screens). Level-4 mindset applies:
 * the modal owns the keyboard the moment it opens, and never leaks focus to
 * `document.body` while open.
 */
import { useRef } from "react";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
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
  /** Disable the submit action (F8: never a silent no-op — the invalid input is
   *  surfaced by `error` below while the submit can't fire). */
  readonly submitDisabled?: boolean;
  /** Inline validation message shown inside the modal (e.g. a non-numeric
   *  counter-offer). */
  readonly error?: string | null;
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
  submitDisabled = false,
  error = null,
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
      // Do not submit an invalid draft — the disabled submit is the visible
      // gate and the inline error explains why (never a silent no-op).
      if (submitDisabled) return;
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
        className="w-full max-w-sm rounded-panel border border-panel-border bg-panel-bg-strong p-3 text-text-primary shadow-2xl"
      >
        <h2 className="text-lg font-semibold">{title}</h2>
        {description !== undefined && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
        <label className="mt-3 block text-sm text-text-body">
          {inputLabel}
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={amountValue}
            onChange={(event) => onAmountChange(event.target.value)}
            className="mt-1"
          />
        </label>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={submitDisabled} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
        {error !== null && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </div>
  );
};