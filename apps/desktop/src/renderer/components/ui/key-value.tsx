import * as React from "react";

import { cn } from "../../lib/utils.js";

/*
 * Facts about one subject, as a definition list: a manager's details, a club's
 * figures, a selection estimate. A `<dl>` rather than a table, so a screen
 * reader hears each key with its value. The parts own the type — keys are the
 * `text-label` role, values `text-data` (see the type scale in index.css) — and
 * the call site owns the layout, so the same fact reads at the same size on
 * every screen whether it sits in a justified row or a two-column grid.
 */

interface KeyValueListProps extends React.ComponentProps<"dl"> {
  ref?: React.Ref<HTMLDListElement> | undefined;
}

const KeyValueList = ({ className, ref, ...props }: KeyValueListProps) => (
  <dl ref={ref} className={cn("text-data", className)} {...props} />
);
KeyValueList.displayName = "KeyValueList";

interface KeyValueRowProps extends React.ComponentProps<"div"> {
  ref?: React.Ref<HTMLDivElement> | undefined;
}

/** One key/value pair laid out as a row: key left, value right. Omit it when
 *  the list is a grid that places `KeyValueKey`/`KeyValueValue` directly. */
const KeyValueRow = ({ className, ref, ...props }: KeyValueRowProps) => (
  <div
    ref={ref}
    className={cn("flex items-baseline justify-between gap-4", className)}
    {...props}
  />
);
KeyValueRow.displayName = "KeyValueRow";

interface KeyValueKeyProps extends React.ComponentProps<"dt"> {
  ref?: React.Ref<HTMLElement> | undefined;
}

const KeyValueKey = ({ className, ref, ...props }: KeyValueKeyProps) => (
  <dt ref={ref} className={cn("text-label text-text-secondary", className)} {...props} />
);
KeyValueKey.displayName = "KeyValueKey";

interface KeyValueValueProps extends React.ComponentProps<"dd"> {
  ref?: React.Ref<HTMLElement> | undefined;
}

const KeyValueValue = ({ className, ref, ...props }: KeyValueValueProps) => (
  <dd
    ref={ref}
    className={cn("text-data font-semibold text-text-primary", className)}
    {...props}
  />
);
KeyValueValue.displayName = "KeyValueValue";

export { KeyValueKey, KeyValueList, KeyValueRow, KeyValueValue };
