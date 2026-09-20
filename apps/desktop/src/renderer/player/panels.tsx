/**
 * The panel CM 03/04 built every player surface out of: a yellow section title over a body.
 *
 * Two shapes, because a panel's body is either a definition list or it is prose, and one component
 * covering both would put a `<p>` inside a `<dl>`. `PlayerPanel` is the label/value form the
 * Attribute columns and Contract Details use; `PlayerNotePanel` is the form a panel of sentences
 * uses. Shared across the player tabs so a new panel is one of these two rather than another local
 * copy of the same class strings.
 */
import type { ReactNode } from "react";

const PANEL_CLASS = "rounded-panel bg-panel-bg px-3 pt-2 pb-3";
const TITLE_CLASS = "text-base font-bold text-text-highlight";

/** A panel whose body is label/value rows. Children are `PlayerRow`s. */
export const PlayerPanel = ({
  title,
  className,
  children,
}: {
  readonly title: string;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <section aria-label={title} className={`${PANEL_CLASS} ${className ?? ""}`}>
    <h2 className={TITLE_CLASS}>{title}</h2>
    <dl className="mt-1.5">{children}</dl>
  </section>
);

/** A panel whose body is prose or a control rather than rows. */
export const PlayerNotePanel = ({
  title,
  className,
  children,
}: {
  readonly title: string;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <section aria-label={title} className={`${PANEL_CLASS} ${className ?? ""}`}>
    <h2 className={TITLE_CLASS}>{title}</h2>
    <div className="mt-1.5">{children}</div>
  </section>
);

/**
 * One row of a `PlayerPanel`. A `<dt>`/`<dd>` pair rather than a two-cell table row: these are
 * definitions of one subject, so the pairing is in the markup and a screen reader reads "Wages,
 * 7,000 Cr per season" without a column header to carry it.
 */
export const PlayerRow = ({
  label,
  value,
  emphasis,
}: {
  readonly label: string;
  readonly value: ReactNode;
  /** Draw the label in the value's colour, the way CM tinted its derived lines (Condition,
   *  Preferred Foot) to set them apart from the raw Attributes above them. */
  readonly emphasis?: boolean;
}) => (
  <div className="flex items-baseline justify-between gap-4 py-0.5 text-sm">
    <dt className={emphasis === true ? "text-text-highlight" : "text-text-body"}>{label}</dt>
    <dd className="font-semibold text-text-highlight">{value}</dd>
  </div>
);
