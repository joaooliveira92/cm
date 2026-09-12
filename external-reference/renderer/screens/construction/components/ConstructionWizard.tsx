import { memo, useMemo } from "react";
import type { CompiledDesignVersion } from "@bluewave/campaign-engine";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert.js";
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

function derivedConstructionCosts(design: CompiledDesignVersion): {
  projectedCost: number;
  projectedCapacityUnits: number;
} {
  // Mirrors packages/campaign-engine/src/construction.ts construction_order_v1:
  // 1 cost unit per 100t displacement, capacity in kilotons.
  return {
    projectedCost: Math.round(design.mass / 100),
    projectedCapacityUnits: Math.round(design.mass / 1000),
  };
}

export interface ConstructionWizardProps {
  readonly design: CompiledDesignVersion | null;
  readonly economy: { readonly treasury: number; readonly shipyardCapacity: number } | null;
  readonly workspace: {
    readonly treasuryReserved: number;
    readonly capacityReserved: number;
  } | null;
  readonly busy: boolean;
  readonly notice: string | null;
  readonly onConfirm: () => void;
  readonly onCancelWizard?: () => void;
}

export const ConstructionWizard = memo(function ConstructionWizard({
  design,
  economy,
  workspace,
  busy,
  notice,
  onConfirm,
  onCancelWizard,
}: ConstructionWizardProps) {
  const costs = useMemo(() => (design ? derivedConstructionCosts(design) : null), [design]);

  if (design === null || costs === null) {
    return (
      <Card data-testid="construction-wizard-empty">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Order Review</CardTitle>
          <CardDescription>Select a design to review its order details.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const treasury = economy?.treasury ?? 0;
  const capacity = economy?.shipyardCapacity ?? 0;
  const reservedTreasury = workspace?.treasuryReserved ?? 0;
  const reservedCapacity = workspace?.capacityReserved ?? 0;
  const afterTreasury = reservedTreasury + costs.projectedCost;
  const afterCapacity = reservedCapacity + costs.projectedCapacityUnits;
  const treasuryOver = afterTreasury > treasury;
  const capacityOver = afterCapacity > capacity;

  return (
    <Card data-testid="construction-wizard">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Review — {design.className}</CardTitle>
        <CardDescription>
          Select-design → review → confirm. No ship name, no completion-time estimate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div data-testid="wizard-design-summary" className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Design summary
          </h4>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="font-mono text-[11px]">
              {design.className}
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {design.shipType}
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {design.year}
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {design.mass.toLocaleString()}t
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {design.speed}kt
            </Badge>
            <Badge variant="outline" className="font-mono text-[11px]">
              {design.machineryType}
            </Badge>
          </div>
          {design.requiredTechnologyIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {design.requiredTechnologyIds.join(", ")}
            </p>
          )}
        </div>

        <div data-testid="wizard-dock-requirement" className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Dock requirement
          </h4>
          <p className="font-mono text-sm">
            {costs.projectedCapacityUnits.toLocaleString()} capacity units required
            <span className="text-muted-foreground">
              {" "}
              · shipyard capacity {capacity.toLocaleString()}
            </span>
          </p>
          {capacityOver && (
            <p className="text-xs text-destructive">
              INSUFFICIENT_CAPACITY — required exceeds available capacity.
            </p>
          )}
        </div>

        <div data-testid="wizard-projected-cost" className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total projected cost
          </h4>
          <p className="font-mono text-sm">
            {costs.projectedCost.toLocaleString()} treasury units
            <span className="text-muted-foreground"> · construction_order_v1 · 1 per 100t</span>
          </p>
        </div>

        <div data-testid="wizard-reservation-impact" className="space-y-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Reservation impact
          </h4>
          <p className="font-mono text-xs">
            Treasury reserved {reservedTreasury.toLocaleString()} → {afterTreasury.toLocaleString()}{" "}
            / {treasury.toLocaleString()}
            {treasuryOver ? " · exceeds treasury" : ""}
          </p>
          <p className="font-mono text-xs">
            Capacity reserved {reservedCapacity.toLocaleString()} → {afterCapacity.toLocaleString()}{" "}
            / {capacity.toLocaleString()}
            {capacityOver ? " · exceeds capacity" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Order reserves the full projected cost immediately; low cash is INSUFFICIENT_FUNDS,
            never placed with warning.
          </p>
          {treasuryOver && (
            <p className="text-xs text-destructive">
              INSUFFICIENT_FUNDS — treasury cannot cover projected cost.
            </p>
          )}
        </div>

        {notice !== null && (
          <Alert variant="destructive">
            <AlertTitle>Not applied</AlertTitle>
            <AlertDescription className="whitespace-pre-wrap">{notice}</AlertDescription>
          </Alert>
        )}

        <ButtonGroup>
          <Button data-testid="wizard-confirm" onClick={onConfirm} disabled={busy} size="sm">
            Confirm order
          </Button>
          {onCancelWizard && (
            <Button variant="outline" size="sm" onClick={onCancelWizard} disabled={busy}>
              Back to catalog
            </Button>
          )}
        </ButtonGroup>
      </CardContent>
    </Card>
  );
});
