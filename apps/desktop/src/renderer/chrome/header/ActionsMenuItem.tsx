interface ActionsMenuItemProps {
  readonly label: string;
  readonly available: boolean;
  readonly unavailableReason: string | undefined;
  readonly destructive: boolean;
  readonly onSelect: () => void;
}

export const ActionsMenuItem = ({
  label,
  available,
  unavailableReason,
  destructive,
  onSelect,
}: ActionsMenuItemProps) => (
  <button
    type="button"
    disabled={!available}
    title={available ? undefined : unavailableReason}
    className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-body ${
 destructive
 ? "text-destructive hover:bg-destructive/10"
 : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
 } disabled:cursor-not-allowed disabled:opacity-50`}
    onClick={onSelect}
  >
    <span>{label}</span>
  </button>
);
