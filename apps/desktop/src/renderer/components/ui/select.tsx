"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import * as React from "react";

import { cn } from "../../lib/utils.js";

const Select = SelectPrimitive.Root;

const SelectTrigger = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) => (
  <SelectPrimitive.Trigger
    className={cn(
      "flex h-8 w-full items-center justify-between gap-2 rounded-control border border-border-subtle bg-field-bg px-2 text-xs text-text-primary outline-none transition-colors",
      "hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      "data-[placeholder]:text-text-muted",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon className="shrink-0 text-text-muted [&>svg]:size-3">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
);
SelectTrigger.displayName = "SelectTrigger";

const SelectValue = SelectPrimitive.Value;

const SelectContent = ({
  className,
  children,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Popup> & {
  /** Gap between the trigger and the popup. */
  sideOffset?: number;
}) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Positioner sideOffset={sideOffset}>
      <SelectPrimitive.Popup
        className={cn(
          "z-50 max-h-60 min-w-[8rem] overflow-y-auto rounded-md border border-border-subtle bg-surface p-1 text-text-primary shadow-panel",
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        {...props}
      >
        {children}
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>
  </SelectPrimitive.Portal>
);
SelectContent.displayName = "SelectContent";

const SelectItem = ({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) => (
  <SelectPrimitive.Item
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-6 text-xs outline-none",
      "data-[highlighted]:bg-surface-raised data-[highlighted]:text-text-primary",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator className="absolute right-1.5 flex items-center justify-center text-text-secondary">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
);
SelectItem.displayName = "SelectItem";

const SelectLabel = SelectPrimitive.GroupLabel;

const SelectSeparator = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) => (
  <SelectPrimitive.Separator
    className={cn("-mx-1 my-1 h-px bg-border-subtle", className)}
    {...props}
  />
);
SelectSeparator.displayName = "SelectSeparator";

export {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
