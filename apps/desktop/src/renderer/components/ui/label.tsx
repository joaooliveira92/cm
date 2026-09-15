import * as React from "react";

import { cn } from "../../lib/utils.js";

interface LabelProps extends React.ComponentProps<"label"> {
  ref?: React.Ref<HTMLLabelElement> | undefined;
}

const Label = ({ className, ref, ...props }: LabelProps) => (
  <label
    ref={ref}
    className={cn(
      // The 12px label/metadata tier per the density contract (`text-xs`),
      // secondary-toned. Labels describe fields; they are not the loudest text
      // on screen.
      "text-xs leading-none text-text-secondary peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
);
Label.displayName = "Label";

export { Label };
