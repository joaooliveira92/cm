import * as React from "react";

import { cn } from "../../lib/utils.js";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  ref?: React.Ref<HTMLTableElement> | undefined;
}

const Table = ({ className, ref, ...props }: TableProps) => (
  <div className="relative w-full overflow-auto">
    <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);
Table.displayName = "Table";

interface TableSectionProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  ref?: React.Ref<HTMLTableSectionElement> | undefined;
}

const TableHeader = ({ className, ref, ...props }: TableSectionProps) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
);
TableHeader.displayName = "TableHeader";

const TableBody = ({ className, ref, ...props }: TableSectionProps) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);
TableBody.displayName = "TableBody";

const TableFooter = ({ className, ref, ...props }: TableSectionProps) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
);
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  ref?: React.Ref<HTMLTableRowElement> | undefined;
}

const TableRow = ({ className, ref, ...props }: TableRowProps) => (
  <tr
    ref={ref}
    className={cn(
      // Hover, selection and focus must stay separable (the dense-table
      // contract): hover is a neutral lift, selection is the chrome-blue fill,
      // focus is the ring on the row's own name button. `aria-selected` is the
      // renderer's selection channel; `data-state` is upstream's, kept so a
      // pasted component still reads as selected. Selection is marked important
      // so it beats hover on a selected row the pointer happens to be over —
      // the two variants otherwise tie on specificity.
      "border-b border-border-subtle transition-colors hover:bg-row-hover",
      "aria-selected:bg-row-selected! data-[state=selected]:bg-row-selected!",
      className,
    )}
    {...props}
  />
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  ref?: React.Ref<HTMLTableCellElement> | undefined;
}

const TableHead = ({ className, ref, ...props }: TableHeadProps) => (
  <th
    ref={ref}
    className={cn(
      "h-6 px-2 text-left align-middle text-2xs font-semibold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
);
TableHead.displayName = "TableHead";

interface TableTdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  ref?: React.Ref<HTMLTableCellElement> | undefined;
}

const TableCell = ({ className, ref, ...props }: TableTdProps) => (
  <td
    ref={ref}
    className={cn(
      "px-2 py-0.5 align-middle text-xs [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
);
TableCell.displayName = "TableCell";

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  ref?: React.Ref<HTMLTableCaptionElement> | undefined;
}

const TableCaption = ({ className, ref, ...props }: TableCaptionProps) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
