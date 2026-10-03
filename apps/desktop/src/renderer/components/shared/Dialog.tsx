import type { ReactNode } from "react";
import { cn } from "../../lib/utils.js";
import { MODAL_BODY, MODAL_COMPACT, MODAL_SCRIM, MODAL_TITLE_BAND } from "../../theme.js";

export interface DialogProps {
  readonly title: string;
  readonly onClose: () => void;
  readonly dialogClassName?: string;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

export const Dialog = ({ title, onClose, dialogClassName, bodyClassName, children }: DialogProps) => (
  <div
    className={MODAL_SCRIM}
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(MODAL_COMPACT, dialogClassName)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className={MODAL_TITLE_BAND}>
        <h2 className="text-heading">{title}</h2>
      </div>
      <div className={cn(MODAL_BODY, bodyClassName)}>
        {children}
      </div>
    </div>
  </div>
);