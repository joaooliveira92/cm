import { memo } from "react";
import type { FleetDivisionView } from "../../../../shared/fleet-contract.js";
import { Badge } from "../../../components/ui/badge.js";
import { CardContent } from "../../../components/ui/card.js";
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "../../../components/ui/empty.js";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group.js";

export interface DivisionPickerProps {
  readonly divisions: readonly FleetDivisionView[];
  readonly selectedDivisionId: string | null;
  readonly onSelectDivision: (divisionId: string) => void;
  readonly areaName: (areaId: string) => string;
}

export const DivisionPicker = memo(function DivisionPicker({
  divisions,
  selectedDivisionId,
  onSelectDivision,
  areaName,
}: DivisionPickerProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-medium">Divisions</h3>
        <Badge variant="secondary" className="text-xs">
          {divisions.length}
        </Badge>
      </div>
      {divisions.length === 0 ? (
        <Empty>
          <EmptyIcon />
          <EmptyTitle>No player division</EmptyTitle>
          <EmptyDescription>This campaign has no player division.</EmptyDescription>
        </Empty>
      ) : (
        <RadioGroup
          value={selectedDivisionId}
          onValueChange={(value) => onSelectDivision(value as string)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {divisions.map((division) => (
            <RadioGroupItem key={division.divisionId} value={division.divisionId}>
              <CardContent className="p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{division.divisionId}</p>
                  <p className="text-xs text-muted-foreground">
                    {division.fleetName} · {areaName(division.areaId)}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {division.ships.slice(0, 4).map((ship) => (
                      <span
                        key={ship.name}
                        className="inline-block rounded-sm bg-accent px-1.5 py-0.5 text-xs text-accent-foreground"
                      >
                        {ship.name}
                      </span>
                    ))}
                    {division.ships.length > 4 && (
                      <span className="inline-block rounded-sm bg-accent px-1.5 py-0.5 text-xs text-muted-foreground">
                        +{division.ships.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </RadioGroupItem>
          ))}
        </RadioGroup>
      )}
    </section>
  );
});
