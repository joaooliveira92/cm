/** The shirt-number cell: a starter's slot number on the green chip, a reserve's bench slot (or a
 *  dash) on the blue one. The colour repeats what the label already says, never replaces it. */
export const NumberChip = ({
  label,
  starter,
}: {
  readonly label: string;
  readonly starter: boolean;
}) => (
  <span
    className={`inline-flex h-5 min-w-9 items-center justify-center rounded-control px-1 text-caption font-bold tabular-nums text-text-bright ${
      starter ? "bg-pitch-marker-gk" : "bg-cm-chip-sub"
    }`}
  >
    {label}
  </span>
);
