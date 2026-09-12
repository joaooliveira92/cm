import type { CompetitionId } from "@cm-clone/contracts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.js";

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
    <label
      htmlFor="club-selection-league"
      className="text-2xs font-semibold tracking-wide text-text-muted uppercase"
    >
      League
    </label>
    <Select value={selectedLeagueId} onValueChange={(value) => { if (value !== null) onLeagueChange(value); }}>
      <SelectTrigger
        id="club-selection-league"
        className="w-full rounded-control border border-border-subtle bg-surface-raised px-2 py-1 text-sm text-text-primary"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent side="bottom" align="start" sideOffset={4}>
        {leagues.map((league) => (
          <SelectItem key={league.leagueId} value={league.leagueId}>
            {league.leagueName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);