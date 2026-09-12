import { Select as SelectPrimitive } from "@base-ui/react/select";
import type { CompetitionId } from "@cm-clone/contracts";

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
    <SelectPrimitive.Root value={selectedLeagueId} onValueChange={(value) => { if (value !== null) onLeagueChange(value); }}>
      <SelectPrimitive.Trigger
        id="club-selection-league"
        className="flex h-8 w-full items-center justify-between gap-2 rounded-control border border-border-subtle bg-field-bg px-2 text-xs text-text-primary outline-none transition-colors hover:border-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[placeholder]:text-text-muted"
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="shrink-0 text-text-muted [&>svg]:size-3">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner side="bottom" align="start" sideOffset={4}>
          <SelectPrimitive.Popup
            className="z-50 min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-y-auto rounded-md border border-border-subtle bg-surface p-1 text-text-primary shadow-panel data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
          >
            <SelectPrimitive.List>
              {leagues.map((league) => (
                <SelectPrimitive.Item
                  key={league.leagueId}
                  value={league.leagueId}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-6 text-xs outline-none data-[highlighted]:bg-surface-raised data-[highlighted]:text-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <SelectPrimitive.ItemText>{league.leagueName}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute right-1.5 flex items-center justify-center text-text-secondary">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  </div>
);