import type { BattleOutcome, CommitMonthResponse } from "@bluewave/campaign-engine";
import { CheckCircle2, Crosshair } from "lucide-react";

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
import { ScrollArea } from "../../../components/ui/scroll-area.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.js";
import { cn } from "../../../lib/utils.js";
import { TreasuryGrid } from "./TreasuryGrid.js";

interface TurnReportTabProps {
  readonly commitResult: CommitMonthResponse | null;
}

export function TurnReportTab({ commitResult }: TurnReportTabProps) {
  if (commitResult === null) {
    return (
      <Empty>
        <EmptyIcon>
          <CheckCircle2 />
        </EmptyIcon>
        <EmptyTitle>No turn advanced yet</EmptyTitle>
        <EmptyDescription>
          Advance the turn to generate a report of the month's outcomes.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <CheckCircle2 className="h-4 w-4" />
          Turn Advancement Report — Month {commitResult.report.month.month}/
          {commitResult.report.month.year}
        </CardTitle>
        <CardDescription className="text-xs">
          Review the economic allocations and administrative outcomes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TreasuryGrid report={commitResult.report} />

        <Accordion multiple defaultValue={["events", "ledger", "battle-outcomes"]}>
          <AccordionItem value="events">
            <AccordionTrigger className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Domain Events
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-[140px] rounded-md border bg-muted/20">
                <div className="space-y-1 p-2">
                  {commitResult.domainEvents.map((evt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b p-1 font-mono text-[11px] last:border-0"
                    >
                      <span className="text-foreground">{evt.kind}</span>
                      <Badge variant="secondary" className="scale-90 text-[11px] uppercase">
                        {evt.phase}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="ledger">
            <AccordionTrigger className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Financial Ledger
            </AccordionTrigger>
            <AccordionContent>
              <ScrollArea className="h-[160px] rounded-md border bg-muted/20">
                <Table className="font-mono text-[11px]">
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="p-1">Phase</TableHead>
                      <TableHead className="p-1">Description</TableHead>
                      <TableHead className="p-1 text-right">Amount</TableHead>
                      <TableHead className="p-1 text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commitResult.financialLedger.map((entry, idx) => (
                      <TableRow key={idx} className="h-8">
                        <TableCell className="p-1 text-muted-foreground">{entry.phase}</TableCell>
                        <TableCell className="p-1">{entry.description}</TableCell>
                        <TableCell
                          className={cn(
                            "p-1 text-right font-semibold",
                            entry.amount < 0 ? "text-destructive" : "text-success",
                          )}
                        >
                          {entry.amount}
                        </TableCell>
                        <TableCell className="p-1 text-right font-semibold">
                          {entry.runningBalance}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="battle-outcomes">
            <AccordionTrigger className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Battle Outcomes
            </AccordionTrigger>
            <AccordionContent>
              {commitResult.closingSnapshot.battleOutcomes.length === 0 ? (
                <Empty>
                  <EmptyIcon>
                    <Crosshair />
                  </EmptyIcon>
                  <EmptyTitle>No battles resolved this month.</EmptyTitle>
                  <EmptyDescription>
                    No war-triggered battle reached a resolution during this turn's execution.
                  </EmptyDescription>
                </Empty>
              ) : (
                <ScrollArea className="h-[220px] rounded-md border bg-muted/20">
                  <div className="space-y-2 p-2">
                    {commitResult.closingSnapshot.battleOutcomes.map((battle) => (
                      <BattleOutcomeRow key={battle.battleId} battle={battle} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

/**
 * One resolved battle, straight from the projection — raw engine ids, never
 * invented display names. A battle with `winnerId`/`loserId` both null is
 * genuinely undecided (tie / time limit) and is shown as such: no fabricated
 * winner, no fabricated war score.
 */
function BattleOutcomeRow({ battle }: { readonly battle: BattleOutcome }) {
  const decided = battle.winnerId !== null && battle.loserId !== null;

  return (
    <div className="space-y-1.5 rounded-md border bg-muted/10 p-2.5 font-mono text-[11px]">
      <div className="flex items-center justify-between border-b border-muted/40 pb-1">
        <span className="font-semibold text-foreground">BATTLE: {battle.battleId}</span>
        <Badge variant="outline" className="font-mono text-[10px] uppercase">
          {battle.areaId}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-semibold text-foreground">{battle.attackerId}</span>
        <span className="text-muted-foreground">vs</span>
        <span className="font-semibold text-foreground">{battle.defenderId}</span>
      </div>

      {decided ? (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-success">Winner: {battle.winnerId}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-semibold text-destructive">Loser: {battle.loserId}</span>
        </div>
      ) : (
        <div className="text-muted-foreground">No conclusive result (tie / time limit)</div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase text-muted-foreground">War score delta</span>
        <span className={cn("font-semibold", decided ? "text-success" : "text-muted-foreground")}>
          {decided
            ? battle.warScoreDelta === 0
              ? "n/a (not re-derived)"
              : `+${battle.warScoreDelta}`
            : "0 (non-decided)"}
        </span>
      </div>

      <ShipLossSummary label="Attacker losses" losses={battle.attackerLosses} />
      <ShipLossSummary label="Defender losses" losses={battle.defenderLosses} />

      {battle.explanation.length > 0 && (
        <div className="space-y-0.5 border-t border-muted/40 pt-1">
          {battle.explanation.map((line, idx) => (
            <div key={idx} className="text-[10px] text-muted-foreground">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ship-loss row: count + the raw ship ids, or an honest empty marker. */
function ShipLossSummary({
  label,
  losses,
}: {
  readonly label: string;
  readonly losses: readonly string[];
}) {
  return (
    <div className="border-t border-muted/40 pt-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
        {losses.length === 0 ? (
          <span className="text-muted-foreground">no losses</span>
        ) : (
          <span className="font-semibold text-destructive">{losses.length} lost</span>
        )}
      </div>
      {losses.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {losses.map((shipId) => (
            <code
              key={shipId}
              className="rounded-sm bg-muted/40 px-1 py-0.5 text-[10px] text-foreground"
            >
              {shipId}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}
