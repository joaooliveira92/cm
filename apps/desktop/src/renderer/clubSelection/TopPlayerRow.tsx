import type { ClubSelectionTopPlayer } from "@cm-clone/contracts";
import { Badge } from "../components/ui/badge.js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip.js";

export interface TopPlayerRowProps {
  readonly player: ClubSelectionTopPlayer;
}

export const TopPlayerRow = ({ player }: TopPlayerRowProps) => (
  <li>
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-raised transition-colors">
          <span className="truncate text-body font-medium text-text-primary">{player.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline">
              {player.position}
            </Badge>
            <span className="text-data font-semibold tabular-nums">{player.overallRating}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{player.name}</span>
          <span className="text-data text-text-muted">
            {player.position} · Overall {player.overallRating}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>
  </li>
);
