import type { ClubId, ClubSelectionRow, SaveId } from "@cm-clone/contracts";
import { compareCodeUnits } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/button.js";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/ui/command.js";
import { Label } from "../components/ui/label.js";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.js";
import { describeRpcError, getClubSelection } from "../rpc.js";

/**
 * The manager's favorite team: a searchable picker over the generated world's clubs.
 *
 * The club list is the same `getClubSelection` read the club step uses, loaded lazily when the
 * provisional world is ready. Until then the control is disabled rather than empty — an empty list
 * would read as "no clubs" when the truth is "no world yet".
 *
 * The value is the pick's id and display name; the caller binds it to the world it was picked from.
 */
export const FavoriteTeamField = ({
  saveId,
  value,
  onSelect,
}: {
  readonly saveId: SaveId | null;
  readonly value: { readonly clubId: ClubId; readonly clubName: string } | null;
  readonly onSelect: (club: { readonly clubId: ClubId; readonly clubName: string } | null) => void;
}) => {
  const [clubs, setClubs] = useState<ReadonlyArray<ClubSelectionRow>>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (saveId === null) {
      setClubs([]);
      return;
    }

    let live = true;
    const load = async (): Promise<void> => {
      const outcome = await Effect.runPromise(getClubSelection(saveId).pipe(Effect.result));
      if (!live) return;
      if (Result.isFailure(outcome)) {
        setError(describeRpcError(outcome.failure));
        return;
      }
      setClubs(outcome.success.clubs);
    };

    void load();
    return () => {
      live = false;
    };
  }, [saveId]);

  const sorted = useMemo(
    () => [...clubs].sort((a, b) => compareCodeUnits(a.clubName, b.clubName)),
    [clubs],
  );

  const disabled = saveId === null;

  return (
    <div>
      <Label className="block">Favorite team</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              aria-label="Favorite team"
              disabled={disabled}
              className="mt-2 w-full justify-between font-normal"
            />
          }
        >
          <span className={value === null ? "text-text-muted" : undefined}>
            {value?.clubName ?? (disabled ? "Unavailable until the world is ready" : "Select a club")}
          </span>
          <ChevronsUpDown className="opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Search clubs…" />
            <CommandList>
              <CommandEmpty>{error ?? "No club found."}</CommandEmpty>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onSelect(null);
                  setOpen(false);
                }}
              >
                <Check className={value === null ? "opacity-100" : "opacity-0"} />
                No favorite team
              </CommandItem>
              {sorted.map((club) => (
                <CommandItem
                  key={club.clubId}
                  value={club.clubName}
                  onSelect={() => {
                    onSelect({ clubId: club.clubId, clubName: club.clubName });
                    setOpen(false);
                  }}
                >
                  <Check
                    className={value?.clubId === club.clubId ? "opacity-100" : "opacity-0"}
                  />
                  {club.clubName}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <p className="mt-2 text-xs text-text-muted">
        Leave blank if you don&apos;t support a club.
      </p>
    </div>
  );
};
