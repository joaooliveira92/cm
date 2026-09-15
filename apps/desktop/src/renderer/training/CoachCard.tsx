import { FOCUS_RING } from "../focus.js";

/**
 * A coach assignment card showing name, quality rating, and department.
 *
 * Designed to be extractable for reuse in Screen 105 (Training Overview) — the component
 * receives all data as props and has no external dependencies beyond the focus ring class.
 *
 * ## States
 *
 * - **name**: The coach's full name as stored in the `staff` table.
 * - **quality**: The coach's quality rating (1-20), displayed as "Quality: N/20".
 * - **department**: The department/specialty string (always "Coaching" for a coach).
 */
export const CoachCard = ({
  name,
  quality,
  department,
}: {
  readonly name: string;
  readonly quality: number;
  readonly department: string;
}) => (
  <div
    className={`rounded-panel border border-panel-border bg-card p-4 text-card-foreground shadow-panel ${FOCUS_RING.join(" ")}`}
    role="listitem"
    aria-label={`Coach ${name}, quality ${quality}`}
  >
    <div className="flex items-center justify-between">
      <h3 className="text-base font-semibold text-text-primary">{name}</h3>
      <span className="rounded-control bg-panel-bg px-2 py-0.5 text-sm font-medium tabular-nums text-text-secondary">
        {quality}/20
      </span>
    </div>
    <p className="mt-1 text-xs text-text-secondary">{department}</p>
  </div>
);