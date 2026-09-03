import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Anchor, Check, Plane, RefreshCw, Send, Ship, Sailboat, Waves } from "lucide-react";
import type { CompiledDesignVersion } from "@bluewave/campaign-engine";
import { Alert, AlertDescription } from "../../../components/ui/alert.js";
import { Badge } from "../../../components/ui/badge.js";
import { Button } from "../../../components/ui/button.js";
import { ButtonGroup } from "../../../components/ui/button-group.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "../../../components/ui/empty.js";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip.js";

export interface DesignPickerProps {
  readonly designs: readonly CompiledDesignVersion[];
  readonly selectedDesignId: string | null;
  readonly onSelectDesign: (designId: string) => void;
  readonly onSubmit: () => void;
  readonly onRefresh: () => void;
  readonly busy: boolean;
  readonly hasPendingRequest: boolean;
  readonly onRetry: (() => void) | undefined;
  readonly notice: string | null;
}

const SHIP_TYPE_ICONS: Record<string, LucideIcon> = {
  battleship: Anchor,
  battlecruiser: Anchor,
  cruiser: Ship,
  destroyer: Sailboat,
  submarine: Waves,
  carrier: Plane,
};

function shipTypeIcon(shipType: string): LucideIcon {
  return SHIP_TYPE_ICONS[shipType] ?? Ship;
}

export const DesignPicker = memo(function DesignPicker({
  designs,
  selectedDesignId,
  onSelectDesign,
  onSubmit,
  onRefresh,
  busy,
  hasPendingRequest,
  onRetry,
  notice,
}: DesignPickerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Design Catalog</CardTitle>
        <CardDescription>
          Select an approved design to submit, replace, or reissue a command.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {designs.length === 0 ? (
          <Empty>
            <EmptyIcon />
            <EmptyTitle>No approved designs</EmptyTitle>
            <EmptyDescription>No approved design is available for this campaign.</EmptyDescription>
          </Empty>
        ) : (
          <TooltipProvider>
            <RadioGroup
              value={selectedDesignId}
              onValueChange={(value) => onSelectDesign(value as string)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {designs.map((design) => {
                const Icon = shipTypeIcon(design.shipType);
                return (
                  <RadioGroupItem
                    key={design.designId}
                    value={design.designId}
                    className="group relative overflow-hidden"
                  >
                    <div
                      className="pointer-events-none absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition-opacity group-data-checked:opacity-100"
                      aria-hidden="true"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                    <CardContent className="space-y-3 p-3.5">
                      <div className="flex items-start gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-data-checked:bg-primary group-data-checked:text-primary-foreground">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="truncate pr-5 font-semibold leading-tight">
                            {design.className}
                          </p>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            {design.shipType}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="font-mono text-[11px] font-normal">
                          {design.year}
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[11px] font-normal">
                          {design.mass.toLocaleString()}t
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[11px] font-normal">
                          {design.speed}kt
                        </Badge>
                        {design.carrierAttributes !== undefined && (
                          <Badge
                            variant="outline"
                            className="gap-1 font-mono text-[11px] font-normal"
                          >
                            <Plane className="h-3 w-3" />
                            {design.carrierAttributes.aircraftCapacity}
                          </Badge>
                        )}
                      </div>
                      {design.requiredTechnologyIds.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger render={<span className="inline-flex" />}>
                            <Badge variant="secondary" className="text-[11px]">
                              {design.requiredTechnologyIds.length} required tech
                              {design.requiredTechnologyIds.length === 1 ? "" : "s"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {design.requiredTechnologyIds.join(", ")}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </CardContent>
                  </RadioGroupItem>
                );
              })}
            </RadioGroup>
          </TooltipProvider>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <ButtonGroup>
            <Button
              variant="default"
              size="sm"
              onClick={onSubmit}
              disabled={busy || selectedDesignId === null}
            >
              <Send className="h-3.5 w-3.5" />
              Submit Construction Command
            </Button>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </ButtonGroup>
          {hasPendingRequest && onRetry !== undefined && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry Pending Request
            </Button>
          )}
        </div>

        {notice !== null && (
          <Alert>
            <AlertDescription className="whitespace-pre-line">{notice}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
});
