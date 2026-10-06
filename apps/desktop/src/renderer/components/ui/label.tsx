import * as React from "react";

import { cn } from "../../lib/utils.js";

interface LabelProps extends React.ComponentProps<"label"> {
  ref?: React.Ref<HTMLLabelElement> | undefined;
}

const Label = ({ className, ref, ...props }: LabelProps) => (
  <label
    ref={ref}
    className={cn(
      // The `text-label` role (12px, medium; see the type scale in index.css),
      // secondary-toned. Labels describe fields; they are not the loudest text
      // on screen.
      "text-label leading-none text-text-secondary peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
      className,
    )}
    {...props}
  />
);
Label.displayName = "Label";

export { Label };
