import type { LandTargetDamage, MinePressure, SubmarinePool } from "@bluewave/campaign-engine";
import { Map, Shield, ShieldAlert } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion.js";
import { Badge } from "../../../components/ui/badge.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "../../../components/ui/empty.js";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "../../../components/ui/item.js";
import { Progress } from "../../../components/ui/progress.js";

interface StrategicOverviewTabProps {
  readonly submarinePools: readonly SubmarinePool[];
  readonly minePressure: readonly MinePressure[];
  readonly landTargetDamage: readonly LandTargetDamage[];
}

export function StrategicOverviewTab({
  submarinePools,
  minePressure,
  landTargetDamage,
}: StrategicOverviewTabProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Theater Status</CardTitle>
        <CardDescription className="text-[11px]">
          Submarine deployments, mine pressure, and coastal defense integrity across active
          theaters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion multiple defaultValue={["subs", "mines", "defenses"]}>
          <AccordionItem value="subs">
            <AccordionTrigger>
              <span className="flex items-center gap-1.5">
                <Map className="h-4 w-4 text-primary" />
                Submarine Warfare Pools
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {submarinePools.length === 0 ? (
                <Empty>
                  <EmptyIcon>
                    <Map />
                  </EmptyIcon>
                  <EmptyTitle>No submarine deployments</EmptyTitle>
                  <EmptyDescription>Nothing reported for the current theater yet.</EmptyDescription>
                </Empty>
              ) : (
                <div className="space-y-2">
                  {submarinePools.map((pool, idx) => (
                    <Item key={idx}>
                      <ItemContent>
                        <ItemTitle>{pool.nationId === "nation_uk" ? "UK" : "Germany"}</ItemTitle>
                        <ItemDescription className="font-mono">
                          {pool.submarineType}
                        </ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Badge variant="secondary" className="font-mono text-[12px]">
                          {pool.available} available
                        </Badge>
                      </ItemActions>
                    </Item>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="mines">
            <AccordionTrigger>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-primary" />
                Sea Mine Pressure Map
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {minePressure.length === 0 ? (
                <Empty>
                  <EmptyIcon>
                    <ShieldAlert />
                  </EmptyIcon>
                  <EmptyTitle>No active minefields</EmptyTitle>
                  <EmptyDescription>No sea zones currently report mine pressure.</EmptyDescription>
                </Empty>
              ) : (
                <div className="space-y-3">
                  {minePressure.map((p, idx) => (
                    <div key={idx} className="space-y-1.5 rounded-md border p-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">
                          {p.areaId === "area_mediterranean" ? "Mediterranean" : p.areaId}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          Sources: {p.sources.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                          <span>Freshness</span>
                          <span>{p.freshness}%</span>
                        </div>
                        <Progress value={p.freshness} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                          <span>Detection confidence</span>
                          <span>{p.detectionConfidence}%</span>
                        </div>
                        <Progress value={p.detectionConfidence} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="defenses">
            <AccordionTrigger>
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-primary" />
                Coastal Defenses & Batteries
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {landTargetDamage.length === 0 ? (
                <Empty>
                  <EmptyIcon>
                    <Shield />
                  </EmptyIcon>
                  <EmptyTitle>No fortified land targets</EmptyTitle>
                  <EmptyDescription>Nothing reported for coastal batteries yet.</EmptyDescription>
                </Empty>
              ) : (
                <div className="space-y-2">
                  {landTargetDamage.map((def, idx) => (
                    <Item key={idx}>
                      <ItemContent>
                        <ItemTitle className="font-normal" title={def.landTargetId}>
                          {def.landTargetId}
                        </ItemTitle>
                      </ItemContent>
                      <ItemActions>
                        <Badge
                          variant={def.state === "intact" ? "default" : "destructive"}
                          className="font-mono text-[12px] uppercase"
                        >
                          {def.state}
                        </Badge>
                      </ItemActions>
                    </Item>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
