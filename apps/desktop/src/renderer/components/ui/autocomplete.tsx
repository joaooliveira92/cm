import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { cva, type VariantProps } from "class-variance-authority";
import { ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils.js";

/*
 * Vendored from the ReUI registry (`@reui/autocomplete`), customized in place: the input takes the
 * app's field tokens, icons come straight from lucide instead of the registry's icon placeholder,
 * and the list scrolls natively rather than through `ScrollArea`, whose viewport here carries no
 * `data-slot` for the registry's selectors to reach, and whose overflow would break sticky group
 * labels.
 */

const inputVariants = cva(
  "flex w-full rounded-control border border-border-subtle bg-field-bg text-xs text-text-primary outline-none transition-colors placeholder:text-text-muted hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        sm: "h-7 px-2",
        default: "h-8 px-2",
        lg: "h-9 px-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const Autocomplete = AutocompletePrimitive.Root;

function AutocompleteValue({ ...props }: AutocompletePrimitive.Value.Props) {
  return <AutocompletePrimitive.Value data-slot="autocomplete-value" {...props} />;
}

function AutocompleteInput({
  className,
  size = "default",
  showClear = false,
  showTrigger = false,
  ...props
}: Omit<AutocompletePrimitive.Input.Props, "size"> &
  VariantProps<typeof inputVariants> & {
    showClear?: boolean;
    showTrigger?: boolean;
  }) {
  return (
    <div className="relative w-full">
      <AutocompletePrimitive.Input
        data-slot="autocomplete-input"
        data-size={size}
        className={cn(
          inputVariants({ size }),
          (showClear || showTrigger) && "pe-7",
          showClear && showTrigger && "pe-12",
          className,
        )}
        {...props}
      />
      {showClear && <AutocompleteClear className={showTrigger ? "end-7" : "end-2"} />}
      {showTrigger && <AutocompleteTrigger className="end-2" />}
    </div>
  );
}

function AutocompleteStatus({ className, ...props }: AutocompletePrimitive.Status.Props) {
  return (
    <AutocompletePrimitive.Status
      data-slot="autocomplete-status"
      className={cn("px-2 py-1.5 text-xs text-text-muted empty:m-0 empty:p-0", className)}
      {...props}
    />
  );
}

function AutocompletePortal({ ...props }: AutocompletePrimitive.Portal.Props) {
  return <AutocompletePrimitive.Portal data-slot="autocomplete-portal" {...props} />;
}

function AutocompleteBackdrop({ ...props }: AutocompletePrimitive.Backdrop.Props) {
  return <AutocompletePrimitive.Backdrop data-slot="autocomplete-backdrop" {...props} />;
}

function AutocompletePositioner({ className, ...props }: AutocompletePrimitive.Positioner.Props) {
  return (
    <AutocompletePrimitive.Positioner
      data-slot="autocomplete-positioner"
      className={cn("z-50 outline-none", className)}
      {...props}
    />
  );
}

function AutocompleteList({ className, ...props }: AutocompletePrimitive.List.Props) {
  return (
    <AutocompletePrimitive.List
      data-slot="autocomplete-list"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain not-empty:scroll-py-1 not-empty:p-1",
        className,
      )}
      {...props}
    />
  );
}

function AutocompleteCollection({
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Collection>) {
  return <AutocompletePrimitive.Collection data-slot="autocomplete-collection" {...props} />;
}

function AutocompleteRow({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Row>) {
  return (
    <AutocompletePrimitive.Row
      data-slot="autocomplete-row"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}

function AutocompleteItem({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Item>) {
  return (
    <AutocompletePrimitive.Item
      data-slot="autocomplete-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-text-primary outline-none",
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export interface AutocompleteContentProps extends React.ComponentProps<
  typeof AutocompletePrimitive.Popup
> {
  align?: AutocompletePrimitive.Positioner.Props["align"];
  sideOffset?: AutocompletePrimitive.Positioner.Props["sideOffset"];
  alignOffset?: AutocompletePrimitive.Positioner.Props["alignOffset"];
  side?: AutocompletePrimitive.Positioner.Props["side"];
  anchor?: AutocompletePrimitive.Positioner.Props["anchor"];
  showBackdrop?: boolean;
}

function AutocompleteContent({
  className,
  children,
  showBackdrop = false,
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  side = "bottom",
  anchor,
  ...props
}: AutocompleteContentProps) {
  return (
    <AutocompletePortal>
      {showBackdrop && <AutocompleteBackdrop />}
      <AutocompletePositioner
        align={align}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        side={side}
        anchor={anchor}
      >
        <AutocompletePrimitive.Popup
          data-slot="autocomplete-popup"
          className={cn(
            "flex max-h-[min(var(--available-height),24rem)] w-(--anchor-width) max-w-(--available-width) origin-(--transform-origin) flex-col rounded-md border bg-popover text-popover-foreground shadow-md outline-none",
            "transition-[scale,opacity] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePositioner>
    </AutocompletePortal>
  );
}

function AutocompleteGroup({ ...props }: React.ComponentProps<typeof AutocompletePrimitive.Group>) {
  return <AutocompletePrimitive.Group data-slot="autocomplete-group" {...props} />;
}

function AutocompleteGroupLabel({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.GroupLabel>) {
  return (
    <AutocompletePrimitive.GroupLabel
      data-slot="autocomplete-group-label"
      className={cn("px-2 py-1.5 text-2xs font-medium text-text-muted", className)}
      {...props}
    />
  );
}

function AutocompleteEmpty({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Empty>) {
  return (
    <AutocompletePrimitive.Empty
      data-slot="autocomplete-empty"
      className={cn("px-2 py-4 text-center text-xs text-text-muted empty:m-0 empty:p-0", className)}
      {...props}
    />
  );
}

function AutocompleteClear({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Clear>) {
  return (
    <AutocompletePrimitive.Clear
      data-slot="autocomplete-clear"
      aria-label="Clear"
      className={cn(
        "absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-sm opacity-60 transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none data-disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      <X className="size-3.5" />
    </AutocompletePrimitive.Clear>
  );
}

function AutocompleteTrigger({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Trigger>) {
  return (
    <AutocompletePrimitive.Trigger
      data-slot="autocomplete-trigger"
      className={cn(
        "absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none data-disabled:pointer-events-none",
        className,
      )}
      {...props}
    >
      <ChevronsUpDown className="size-3.5 opacity-50" />
    </AutocompletePrimitive.Trigger>
  );
}

function AutocompleteArrow({ ...props }: React.ComponentProps<typeof AutocompletePrimitive.Arrow>) {
  return <AutocompletePrimitive.Arrow data-slot="autocomplete-arrow" {...props} />;
}

function AutocompleteSeparator({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Separator>) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="autocomplete-separator"
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  Autocomplete,
  AutocompleteArrow,
  AutocompleteBackdrop,
  AutocompleteClear,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePortal,
  AutocompletePositioner,
  AutocompleteRow,
  AutocompleteSeparator,
  AutocompleteStatus,
  AutocompleteTrigger,
  AutocompleteValue,
};
