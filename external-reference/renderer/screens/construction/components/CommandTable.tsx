import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Ban, CheckCircle2, Clock, RefreshCwOff } from "lucide-react";
import type { ConstructionCommand, ConstructionCommandStatus } from "@bluewave/campaign-engine";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table.js";

export interface CommandTableProps {
  readonly commands: readonly ConstructionCommand[];
  readonly busy: boolean;
  readonly selectedDesignId: string | null;
  readonly onReplace: (commandId: string) => void;
  readonly onCancel: (commandId: string) => void;
}

const STATUS_ICON: Record<ConstructionCommandStatus, LucideIcon> = {
  submitted: Clock,
  accepted: CheckCircle2,
  superseded: RefreshCwOff,
  cancelled: Ban,
};

const STATUS_CLASSNAME: Record<ConstructionCommandStatus, string> = {
  submitted: "border-transparent bg-warning/15 text-warning",
  accepted: "border-transparent bg-success/15 text-success",
  superseded: "border-transparent bg-secondary text-secondary-foreground",
  cancelled: "text-muted-foreground",
};

export const CommandTable = memo(function CommandTable({
  commands,
  busy,
  selectedDesignId,
  onReplace,
  onCancel,
}: CommandTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Command Ledger</CardTitle>
        <CardDescription>Construction commands submitted this month.</CardDescription>
      </CardHeader>
      <CardContent>
        {commands.length === 0 ? (
          <Empty>
            <EmptyIcon />
            <EmptyTitle>No commands</EmptyTitle>
            <EmptyDescription>
              No construction command has been submitted this month.
            </EmptyDescription>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Design</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Command</TableHead>
                <TableHead className="text-right">Rev</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Capacity</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commands.map((command) => {
                const StatusIcon = STATUS_ICON[command.status];
                return (
                  <TableRow key={command.commandId}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{command.design.className}</span>
                        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                          {command.design.shipType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`gap-1 text-[11px] uppercase ${STATUS_CLASSNAME[command.status]}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {command.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {command.commandId}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {command.submittedAtRevision}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {command.projectedCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {command.projectedCapacityUnits.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {command.status === "submitted" && (
                        <ButtonGroup className="justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReplace(command.commandId)}
                            disabled={busy || selectedDesignId === null}
                          >
                            Replace
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onCancel(command.commandId)}
                            disabled={busy}
                          >
                            Cancel
                          </Button>
                        </ButtonGroup>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
});
