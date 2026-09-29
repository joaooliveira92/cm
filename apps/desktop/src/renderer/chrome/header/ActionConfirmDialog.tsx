import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog.js";
import { FOCUS_RING } from "../../focus.js";

interface ActionConfirmDialogProps {
  readonly label: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export const ActionConfirmDialog = ({ label, onConfirm, onCancel }: ActionConfirmDialogProps) => (
  <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
    <DialogContent className="w-full max-w-xs p-4">
      <DialogTitle className="text-text-primary">
        {label}
      </DialogTitle>
      <p className="text-data text-text-secondary">This action cannot be undone.</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className={`rounded-control bg-surface-raised px-3 py-1 text-body text-text-primary hover:bg-surface ${FOCUS_RING.join(" ")}`}
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className={`rounded-control bg-destructive px-3 py-1 text-body text-white hover:brightness-110 ${FOCUS_RING.join(" ")}`}
          onClick={onConfirm}
        >
          Confirm
        </button>
      </div>
    </DialogContent>
  </Dialog>
);
