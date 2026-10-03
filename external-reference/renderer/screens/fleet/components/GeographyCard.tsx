import { memo } from "react";
import { Card, CardContent } from "../../../components/ui/card.js";

export interface GeographyCardProps {
  readonly areas: readonly { readonly id: string; readonly name: string }[];
  readonly areaEdges: readonly {
    readonly fromAreaId: string;
    readonly toAreaId: string;
  }[];
  readonly ports: readonly {
    readonly id: string;
    readonly name: string;
    readonly areaId: string;
  }[];
  readonly areaName: (areaId: string) => string;
}

export const GeographyCard = memo(function GeographyCard({
  areas,
  areaEdges,
  ports,
  areaName,
}: GeographyCardProps) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-medium">Geography</h3>
      <Card>
        <CardContent className="grid gap-4 py-4 text-sm sm:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Areas
            </p>
            <p className="text-sm">
              {areas.length > 0 ? areas.map((a) => a.name).join(", ") : "none"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Routes
            </p>
            <p className="text-sm">
              {areaEdges.length > 0
                ? areaEdges
                    .map((edge) => `${areaName(edge.fromAreaId)} ↔ ${areaName(edge.toAreaId)}`)
                    .join(" · ")
                : "none"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ports
            </p>
            <p className="text-sm">
              {ports.length > 0
                ? ports.map((port) => `${port.name} (${areaName(port.areaId)})`).join(" · ")
                : "none"}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
});
