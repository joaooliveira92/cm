import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import {
  Select as SelectPrimitive,
} from "@base-ui/react/select";
import * as React from "react";

import { cn } from "../../lib/utils.js";
import { FIELD_SELECT } from "../../theme.js";

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
} | null>(null);

function Select<Value>({
  children,
  value,
  onValueChange,
  disabled,
  items,
  itemToStringValue,
  openOnInputClick = true,
  mode = "list",
  ...props
}: Omit<React.ComponentProps<typeof AutocompletePrimitive.Root>, "items"> & {
  items?: readonly Value[];
  itemToStringValue?: (itemValue: Value) => string;
  children: React.ReactNode;
}) {
  return (
    <AutocompletePrimitive.Root
      value={value as string}
      onValueChange={onValueChange as (value: string) => void}
      disabled={disabled}
      openOnInputClick={openOnInputClick}
      mode={mode}
      items={items}
      itemToStringValue={itemToStringValue as ((itemValue: unknown) => string) | undefined}
      {...props}
    >
      <SelectContext.Provider value={{ value: value as string, onValueChange: onValueChange as (value: string) => void }}>
        {children}
      </SelectContext.Provider>
    </AutocompletePrimitive.Root>
  );
}

function SelectTrigger({
  className,
  children,
  "aria-label": ariaLabel,
  value,
  ...props
}: React.ComponentPropsWithoutRef<typeof AutocompletePrimitive.InputGroup> & {
  children?: React.ReactNode;
  "aria-label"?: string;
  value?: string;
}) {
  const childWithValue = React.Children.map(children, (child) => {
    if (React.isValidElement(child) && (child.type as any)?.displayName === "SelectValue") {
      return React.cloneElement(child as React.ReactElement<{ value?: string }>, { value });
    }
    return child;
  });
  return (
    <AutocompletePrimitive.InputGroup
      data-slot="select-trigger"
      className={cn(
        FIELD_SELECT,
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <AutocompletePrimitive.Input aria-label={ariaLabel} />
      {childWithValue}
    </AutocompletePrimitive.InputGroup>
  );
}

function SelectValue({
  placeholder,
  value,
  ...props
}: {
  placeholder?: string;
  value?: string;
}) {
  return (
    <span data-slot="select-value" {...props}>
      {value ?? placeholder ?? ""}
    </span>
  );
}
SelectValue.displayName = "SelectValue";

function SelectContent({
  className,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 4,
  ...props
}: Omit<React.ComponentProps<typeof AutocompletePrimitive.Popup>, "children"> & {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  children: React.ReactNode;
}) {
  return (
    <AutocompletePrimitive.Portal>
      <AutocompletePrimitive.Positioner className="z-50" side={side} align={align} sideOffset={sideOffset}>
        <AutocompletePrimitive.Popup
          data-slot="select-content"
          className={cn(
            "max-h-60 min-w-[8rem] overflow-y-auto rounded-md border border-border-subtle bg-surface p-1 text-text-primary shadow-panel",
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
            className,
          )}
          {...props}
        >
          {children}
        </AutocompletePrimitive.Popup>
      </AutocompletePrimitive.Positioner>
    </AutocompletePrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  value,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof AutocompletePrimitive.Item>, "value"> & {
  value: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  // Autocomplete has no ItemIndicator (Select's needs a Select.Item context), so the check reads the root value.
  const selected = React.useContext(SelectContext)?.value === value;
  return (
    <AutocompletePrimitive.Item
      data-slot="select-item"
      data-selected={selected || undefined}
      value={value}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-6 text-xs outline-none",
        "data-[highlighted]:bg-surface-raised data-[highlighted]:text-text-primary",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
      {selected && (
        <span className="absolute right-1.5 flex items-center justify-center text-text-secondary">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </AutocompletePrimitive.Item>
  );
}

const SelectGroup = AutocompletePrimitive.Group;

const SelectLabel = AutocompletePrimitive.GroupLabel;

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof AutocompletePrimitive.Separator>) {
  return (
    <AutocompletePrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border-subtle", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center py-1 text-text-muted",
        className,
      )}
      {...props}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center py-1 text-text-muted",
        className,
      )}
      {...props}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </SelectPrimitive.ScrollDownArrow>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
