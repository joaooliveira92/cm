import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { FOCUS_RING } from "../../focus.js";
import { cn } from "../../lib/utils.js";

const Tabs = TabsPrimitive.Root;

// `line` is the ReUI c-tabs-7 look: no track, an underline under the active tab. The triggers read
// the variant off the list through `group/tabs-list`, so a caller sets it once.
const tabsListVariants = cva("group/tabs-list inline-flex h-9 items-center text-muted-foreground", {
  variants: {
    variant: {
      default: "justify-center rounded-lg bg-muted p-1",
      line: "gap-1 border-b border-panel-border",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>,
    VariantProps<typeof tabsListVariants> {
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.List>> | undefined;
}

const TabsList = ({ className, variant, ref, ...props }: TabsListProps) => (
  <TabsPrimitive.List
    ref={ref}
    data-variant={variant ?? "default"}
    className={cn(tabsListVariants({ variant }), className)}
    {...props}
  />
);
TabsList.displayName = TabsPrimitive.List.displayName;

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Tab> {
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.Tab>> | undefined;
}

const TabsTrigger = ({ className, ref, ...props }: TabsTriggerProps) => (
  <TabsPrimitive.Tab
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-label transition-all",
      "disabled:pointer-events-none disabled:opacity-50",
      FOCUS_RING,
      "group-data-[variant=default]/tabs-list:data-active:bg-background data-active:text-foreground",
      "relative group-data-[variant=line]/tabs-list:h-full group-data-[variant=line]/tabs-list:rounded-none group-data-[variant=line]/tabs-list:hover:text-foreground",
      "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
      className,
    )}
    {...props}
  />
);
TabsTrigger.displayName = TabsPrimitive.Tab.displayName;

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Panel> {
  ref?: React.Ref<React.ComponentRef<typeof TabsPrimitive.Panel>> | undefined;
}

const TabsContent = ({ className, ref, ...props }: TabsContentProps) => (
  <TabsPrimitive.Panel
    ref={ref}
    className={cn(
      "mt-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
);
TabsContent.displayName = TabsPrimitive.Panel.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
