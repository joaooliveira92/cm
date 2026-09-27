/**
 * The disclosure primitive behind the sidebar's section submenus.
 *
 * Base UI's panel unmounts its contents while closed (`keepMounted` defaults to
 * false), which the career sidebar relies on: only the expanded section's items
 * are in the document, so an item label like "Transfers" — which two sections
 * both own — resolves to exactly one control.
 */
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import * as React from "react";

import { cn } from "../../lib/utils.js";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

interface CollapsiblePanelProps extends React.ComponentPropsWithoutRef<
  typeof CollapsiblePrimitive.Panel
> {
  ref?: React.Ref<React.ComponentRef<typeof CollapsiblePrimitive.Panel>> | undefined;
}

const CollapsiblePanel = ({ className, ref, ...props }: CollapsiblePanelProps) => (
  <CollapsiblePrimitive.Panel
    ref={ref}
    className={cn("overflow-hidden", className)}
    {...props}
  />
);
CollapsiblePanel.displayName = "CollapsiblePanel";

export { Collapsible, CollapsiblePanel, CollapsibleTrigger };
