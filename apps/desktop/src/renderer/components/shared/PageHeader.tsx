import {
  memo,
  useId,
  type ElementType,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../ui/button.js";
import { cn } from "../../lib/utils.js";

export interface PageHeaderBreadcrumb {
  readonly id: string;
  readonly label: string;
  readonly onClick?: () => void;
}

export interface PageHeaderProps {
  readonly icon?: LucideIcon;
  readonly title: string;
  readonly description?: ReactNode;
  readonly breadcrumbs?: readonly PageHeaderBreadcrumb[];
  readonly onBack?: () => void;
  readonly backLabel?: string;
  readonly actions?: ReactNode;
  readonly headingLevel?: 1 | 2 | 3;
  readonly className?: string;
}

export const PageHeader = memo(function PageHeader({
  icon: Icon,
  title,
  description,
  breadcrumbs = [],
  onBack,
  backLabel = "Back",
  actions,
  headingLevel = 1,
  className,
}: PageHeaderProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as ElementType;

  return (
    <header
      aria-labelledby={headingId}
      className={cn(
        "flex flex-wrap items-start justify-between gap-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {onBack !== undefined && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={backLabel}
            onClick={onBack}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
        )}

        <div className="min-w-0">
          {breadcrumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="mb-0.5 text-[11px] text-muted-foreground"
            >
              <ol className="flex flex-wrap items-center gap-1">
                {breadcrumbs.map((crumb, index) => {
                  const isCurrent = index === breadcrumbs.length - 1;

                  return (
                    <li
                      key={crumb.id}
                      className="flex min-w-0 items-center gap-1"
                    >
                      {index > 0 && (
                        <ChevronRight
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0"
                        />
                      )}

                      {crumb.onClick !== undefined && !isCurrent ? (
                        <button
                          type="button"
                          onClick={crumb.onClick}
                          className={cn(
                            "truncate rounded-sm",
                            "hover:text-foreground hover:underline",
                            "focus-visible:outline-none",
                            "focus-visible:ring-2",
                            "focus-visible:ring-ring",
                            "focus-visible:ring-offset-2",
                          )}
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span
                          aria-current={isCurrent ? "page" : undefined}
                          className={cn(
                            "truncate",
                            isCurrent && "text-foreground",
                          )}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          <Heading
            id={headingId}
            className="flex min-w-0 items-center gap-2 text-lg font-medium tracking-tight"
          >
            {Icon !== undefined && (
              <Icon
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-primary"
              />
            )}

            <span className="break-words">{title}</span>
          </Heading>

          {description !== undefined && (
            <div className="mt-1 text-xs text-muted-foreground">
              {description}
            </div>
          )}
        </div>
      </div>

      {actions !== undefined && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
});