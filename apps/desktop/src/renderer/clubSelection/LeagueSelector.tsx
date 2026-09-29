import type { CompetitionId } from "@cm-clone/contracts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FIELD_LABEL } from "../theme.js";

export interface LeagueOption {
  readonly leagueId: CompetitionId;
  readonly leagueName: string;
}

export interface LeagueSelectorProps {
  readonly leagues: ReadonlyArray<LeagueOption>;
  readonly selectedLeagueId: CompetitionId;
  readonly onLeagueChange: (leagueId: CompetitionId) => void;
}

export const LeagueSelector = ({ leagues, selectedLeagueId, onLeagueChange }: LeagueSelectorProps) => (
  <div className="flex flex-col gap-1">
    <label htmlFor="club-selection-league" className={FIELD_LABEL}>
      League
    </label>
    <Select value={selectedLeagueId} onValueChange={(value) => { if (value !== null) onLeagueChange(value); }}>
      <SelectTrigger id="club-selection-league">
        <SelectValue>
          {leagues.find((l) => l.leagueId === selectedLeagueId)?.leagueName ?? selectedLeagueId}
        </SelectValue>
      </SelectTrigger>
      {/* As wide as the trigger and uncapped: the league list is short, and a scrollbar would
          hide part of it for no gain. */}
      <SelectContent className="max-h-none min-w-[var(--anchor-width)] origin-[var(--transform-origin)]">
        {leagues.map((league) => (
          <SelectItem key={league.leagueId} value={league.leagueId}>
            {league.leagueName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
