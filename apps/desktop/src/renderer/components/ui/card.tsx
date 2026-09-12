import { cn } from "../../lib/utils.js";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  ref?: React.Ref<HTMLDivElement> | undefined;
}

const Card = ({ className, ref, ...props }: CardProps) => (
  <div
    data-slot="card"
    ref={ref}
    className={cn("rounded-panel border border-panel-border bg-card text-card-foreground shadow-panel", className)}
    {...props}
  />
);
Card.displayName = "Card";

const CardHeader = ({ className, ref, ...props }: CardProps) => (
  <div ref={ref} className={cn("flex flex-col space-y-1 px-3 py-2", className)} {...props} />
);
CardHeader.displayName = "CardHeader";

const CardTitle = ({ className, ref, ...props }: CardProps) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
);
CardTitle.displayName = "CardTitle";

const CardDescription = ({ className, ref, ...props }: CardProps) => (
  <div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
);
CardDescription.displayName = "CardDescription";

const CardContent = ({ className, ref, ...props }: CardProps) => (
  <div ref={ref} className={cn("px-3 pb-2 pt-0", className)} {...props} />
);
CardContent.displayName = "CardContent";

const CardFooter = ({ className, ref, ...props }: CardProps) => (
  <div ref={ref} className={cn("flex items-center px-3 pb-2 pt-0", className)} {...props} />
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
