import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card";
import * as React from "react";

import { cn } from "../../lib/utils.js";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

interface HoverCardContentProps extends React.ComponentPropsWithoutRef<
  typeof HoverCardPrimitive.Popup
> {
  align?: React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Positioner>["align"];
  side?: React.ComponentPropsWithoutRef<typeof HoverCardPrimitive.Positioner>["side"];
  sideOffset?: number;
  ref?: React.Ref<React.ComponentRef<typeof HoverCardPrimitive.Popup>> | undefined;
}

const HoverCardContent = ({
  className,
  align = "center",
  side,
  sideOffset = 4,
  ref,
  ...props
}: HoverCardContentProps) => (
  <HoverCardPrimitive.Portal>
    <HoverCardPrimitive.Positioner align={align} side={side} sideOffset={sideOffset}>
      <HoverCardPrimitive.Popup
        ref={ref}
        className={cn(
          "z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",
          "animate-in fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Positioner>
  </HoverCardPrimitive.Portal>
);
HoverCardContent.displayName = "HoverCardContent";

export { HoverCard, HoverCardContent, HoverCardTrigger };
