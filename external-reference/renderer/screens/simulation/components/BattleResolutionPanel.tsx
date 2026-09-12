import type { BattleResolution, TacticalBattleOutcome } from "@bluewave/campaign-engine";
import { Award, Info, Layers } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../components/ui/accordion.js";
import { Badge } from "../../../components/ui/badge.js";
import { Progress } from "../../../components/ui/progress.js";
import { ScrollArea } from "../../../components/ui/scroll-area.js";

const TACTICAL_RESOLVER_MAX_TURNS = 200;

interface BattleResolutionPanelProps {
  readonly autoResolution: BattleResolution | null;
  readonly tacticalOutcome: TacticalBattleOutcome | null;
}

export function BattleResolutionPanel({
  autoResolution,
  tacticalOutcome,
}: BattleResolutionPanelProps) {
  if (autoResolution === null && tacticalOutcome === null) return null;

  return (
    <Accordion multiple defaultValue={["auto", "tactical"]}>
      {autoResolution !== null && (
        <AccordionItem value="auto">
          <AccordionTrigger>
            <span className="flex items-center gap-1.5 font-semibold text-success">
              <Award className="h-3.5 w-3.5" />
              Auto-Resolution Completed
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 rounded-md border border-success/30 bg-success/5 p-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="font-semibold">
                  WINNER: {autoResolution.missionOutcome.winner || "INCONCLUSIVE"}
                </span>
                <Badge variant="outline" className="text-[12px]">
                  {autoResolution.missionOutcome.outcomeKind}
                </Badge>
              </div>
              <div className="text-[11px]">
                War Score Change:{" "}
                <span className="font-semibold text-foreground">
                  {autoResolution.warScoreChange}
                </span>
              </div>
              <div className="mt-2 text-[11px] font-semibold text-muted-foreground">
                SHIP OUTCOMES:
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <span className="font-semibold text-muted-foreground">ATTACKER SHIPS:</span>
                  {autoResolution.attacker.ships.map((s, idx) => (
                    <div key={idx} className="flex justify-between border-b py-0.5 last:border-0">
                      <span>{s.shipId}</span>
                      <span className="font-semibold text-foreground">{s.outcome}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">DEFENDER SHIPS:</span>
                  {autoResolution.defender.ships.map((s, idx) => (
                    <div key={idx} className="flex justify-between border-b py-0.5 last:border-0">
                      <span>{s.shipId}</span>
                      <span className="font-semibold text-foreground">{s.outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {tacticalOutcome !== null && (
        <AccordionItem value="tactical">
          <AccordionTrigger>
            <span className="flex items-center gap-1.5 font-semibold text-warning">
              <Layers className="h-3.5 w-3.5" />
              Tactical Turn-by-Turn Resolver Outcome
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-2 rounded-md border border-warning/30 bg-warning/5 p-3 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[12px] text-muted-foreground">
                  <span>Turns resolved</span>
                  <span>
                    {tacticalOutcome.turnsResolved} / {TACTICAL_RESOLVER_MAX_TURNS}
                  </span>
                </div>
                <Progress
                  value={(tacticalOutcome.turnsResolved / TACTICAL_RESOLVER_MAX_TURNS) * 100}
                />
              </div>
              <div className="text-[11px]">
                End Condition:{" "}
                <span className="font-semibold text-foreground">
                  {tacticalOutcome.endCondition}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-destructive">
                <Info className="h-3.5 w-3.5" />
                Rejected Orders: {tacticalOutcome.rejectedOrders.length} (ADMIRAL RULE TESTPASSED)
              </div>
              <div className="mt-2 text-[12px] font-semibold text-muted-foreground">
                TACTICAL EVENT LEDGER:
              </div>
              <ScrollArea className="h-[120px] rounded border bg-muted/40 p-1.5">
                <div className="space-y-1 text-[11px]">
                  {tacticalOutcome.battleEventLedger.events.map((evt, idx) => (
                    <div key={idx} className="border-b pb-1 last:border-0">
                      [{evt.turn}] <span className="text-foreground">{evt.eventType}</span> —{" "}
                      {JSON.stringify(evt.data)}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </AccordionContent>
        </AccordionItem>
      )}
    </Accordion>
  );
}
