import type { MovementCommand } from "@bluewave/campaign-engine";
import { memo } from "react";
import type {
  FleetDivisionView,
  FleetScreenProjection,
} from "../../../../shared/fleet-contract.js";
import { Alert, AlertDescription } from "../../../components/ui/alert.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { Select } from "../../../components/ui/select.js";
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select.js";

export interface OrderSectionProps {
  readonly areas: FleetScreenProjection["areas"];
  readonly selectedDivision: FleetDivisionView | null;
  readonly destinationAreaId: string | null;
  readonly onDestinationChange: (areaId: string) => void;
  readonly pendingRoute: MovementCommand | null;
  readonly busy: boolean;
  readonly onSubmit: () => void;
  readonly onReplace: (commandId: string) => void;
  readonly onCancel: (commandId: string) => void;
  readonly onRefresh: () => void;
  readonly hasPendingRequest: boolean;
  readonly onRetry: () => void;
  readonly notice: string | null;
  readonly areaName: (areaId: string) => string;
}

export const OrderSection = memo(function OrderSection({
  areas,
  selectedDivision,
  destinationAreaId,
  onDestinationChange,
  pendingRoute,
  busy,
  onSubmit,
  onReplace,
  onCancel,
  onRefresh,
  hasPendingRequest,
  onRetry,
  notice,
  areaName,
}: OrderSectionProps) {
  return (
    <>
      <section>
        <h3 className="mb-3 text-sm font-medium">Order</h3>
        <Card className=" bg-background/80 backdrop-blur-md select-none">
          <CardContent className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium" htmlFor="destination">
                Destination
              </label>
              <Select
                value={destinationAreaId ?? ""}
                onValueChange={onDestinationChange}
                className="w-full"
              >
                <SelectTrigger id="destination">
                  <SelectValue placeholder="Select a destination" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              {selectedDivision === null ? (
                "Select a division."
              ) : pendingRoute === null ? (
                <>
                  <strong>{selectedDivision.divisionId}</strong> is in{" "}
                  {areaName(selectedDivision.areaId)} with no pending route.
                </>
              ) : (
                <>
                  <strong>{selectedDivision.divisionId}</strong> has a pending route{" "}
                  <strong>{areaName(pendingRoute.fromAreaId)}</strong> →{" "}
                  <strong>{areaName(pendingRoute.toAreaId)}</strong>.
                </>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="default"
                onClick={onSubmit}
                disabled={busy || selectedDivision === null || destinationAreaId === null}
              >
                Submit movement command
              </Button>
              {pendingRoute !== null && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onReplace(pendingRoute.commandId)}
                    disabled={busy || destinationAreaId === null}
                  >
                    Replace pending route
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onCancel(pendingRoute.commandId)}
                    disabled={busy}
                  >
                    Cancel pending route
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                Refresh
              </Button>
              {hasPendingRequest && (
                <Button variant="secondary" size="sm" onClick={onRetry}>
                  Retry pending request
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {notice !== null && (
        <Alert>
          <AlertDescription className="whitespace-pre-line">{notice}</AlertDescription>
        </Alert>
      )}
    </>
  );
});
