import type { ClubId, ClubSelectionRow, ClubSelectionView, SaveId } from "@cm-clone/contracts";
import { compareCodeUnits, nationName } from "@cm-clone/shared";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { Effect, Result } from "effect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  AutocompleteCollection,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteGroup,
  AutocompleteGroupLabel,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "../components/ui/autocomplete.js";
import { ClubBadge } from "../components/shared/ClubBadge.js";
import { Label } from "../components/ui/label.js";
import { describeRpcError, getClubSelection } from "../rpc.js";

type FavoriteTeam = { readonly clubId: ClubId; readonly clubName: string };

interface ClubOption {
  readonly club: ClubSelectionRow;
  readonly leagueName: string;
  readonly nation: string;
}

export interface NationGroup {
  readonly nation: string;
  readonly items: ReadonlyArray<ClubOption>;
}

/** Heading for clubs whose league has no nation row. */
const OTHER_NATION = "Other";

/**
 * The clubs of a club-selection view grouped by the nation of their league: nations
 * alphabetically, clubs alphabetically within each.
 */
export const groupClubsByNation = (view: ClubSelectionView): ReadonlyArray<NationGroup> => {
  const leagues = new Map(view.leagues.map((league) => [league.leagueId, league]));
  const byNation = new Map<string, ClubOption[]>();
  for (const club of view.clubs) {
    const league = leagues.get(club.leagueId);
    const nation = league?.nationId == null ? OTHER_NATION : nationName(league.nationId);
    const option = { club, leagueName: league?.leagueName ?? "", nation };
    const bucket = byNation.get(nation);
    if (bucket === undefined) byNation.set(nation, [option]);
    else bucket.push(option);
  }
  return [...byNation.entries()]
    .sort(([a], [b]) => compareCodeUnits(a, b))
    .map(([nation, items]) => ({
      nation,
      items: items.sort((a, b) => compareCodeUnits(a.club.clubName, b.club.clubName)),
    }));
};

/**
 * The manager's favorite team: an autocomplete over the generated world's clubs, grouped by
 * nation, each club drawn with its badge or its initials shield.
 *
 * The club list is the same `getClubSelection` read the club step uses, loaded lazily when the
 * provisional world is ready. Until then the control is disabled rather than empty — an empty list
 * would read as "no clubs" when the truth is "no world yet".
 *
 * The input is free text, so the pick lives in `value`, not in the text: typing only filters, and
 * closing the list without picking puts the chosen club's name back. Clearing the input clears the
 * pick. The value is the pick's id and display name; the caller binds it to the world it was
 * picked from.
 */
export const FavoriteTeamField = ({
  saveId,
  value,
  onSelect,
}: {
  readonly saveId: SaveId | null;
  readonly value: FavoriteTeam | null;
  readonly onSelect: (club: FavoriteTeam | null) => void;
}) => {
  const [groups, setGroups] = useState<ReadonlyArray<NationGroup>>([]);
  const [query, setQuery] = useState(value?.clubName ?? "");
  const [error, setError] = useState<string | null>(null);
  // The committed name, read when the list closes — an item press closes it in the same tick the
  // pick is made, before `value` has come back round through the parent.
  const committedName = useRef(value?.clubName ?? "");

  useEffect(() => {
    committedName.current = value?.clubName ?? "";
    setQuery(value?.clubName ?? "");
  }, [value?.clubName]);

  useEffect(() => {
    if (saveId === null) {
      setGroups([]);
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
      setGroups(groupClubsByNation(outcome.success));
    };

    void load();
    return () => {
      live = false;
    };
  }, [saveId]);

  const { contains } = AutocompletePrimitive.useFilter({ sensitivity: "base" });

  // The committed name in the input is a display, not a search: opening the list over it shows
  // every club rather than just the one already picked.
  const filtered = useMemo(() => {
    if (query === "" || query === value?.clubName) return groups;
    return groups
      .map((group) => ({
        nation: group.nation,
        items: group.items.filter(
          (item) => contains(item.club.clubName, query) || contains(item.nation, query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, value?.clubName, contains]);

  const disabled = saveId === null;

  return (
    <div>
      <Label className="block">Favorite team</Label>
      <div className="mt-2">
        <Autocomplete
          items={filtered}
          value={query}
          onValueChange={(next, details) => {
            setQuery(next);
            if (next === "" && details.reason !== "item-press") {
              committedName.current = "";
              onSelect(null);
            }
          }}
          onOpenChange={(open) => {
            if (!open) setQuery(committedName.current);
          }}
          itemToStringValue={(item: unknown) => (item as ClubOption).club.clubName}
          filter={null}
          disabled={disabled}
          openOnInputClick
        >
          <AutocompleteInput
            aria-label="Favorite team"
            placeholder={disabled ? "Unavailable until the world is ready" : "Search clubs or nations…"}
            showClear={value !== null}
            showTrigger
          />
          <AutocompleteContent>
            <AutocompleteEmpty>{error ?? "No club found."}</AutocompleteEmpty>
            <AutocompleteList className="not-empty:pt-0">
              {(group: NationGroup) => (
                <AutocompleteGroup key={group.nation} items={[...group.items]}>
                  <AutocompleteGroupLabel className="sticky top-0 z-10 bg-popover">
                    {group.nation}
                  </AutocompleteGroupLabel>
                  <AutocompleteCollection>
                    {(item: ClubOption) => (
                      <AutocompleteItem
                        key={item.club.clubId}
                        value={item}
                        aria-selected={item.club.clubId === value?.clubId}
                        className="aria-selected:font-semibold"
                        onClick={() => {
                          committedName.current = item.club.clubName;
                          onSelect({ clubId: item.club.clubId, clubName: item.club.clubName });
                        }}
                      >
                        <ClubBadge
                          badgeKey={item.club.badgeKey}
                          colours={item.club.clubColours}
                          clubName={item.club.clubName}
                          size={24}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate">{item.club.clubName}</div>
                          <div className="truncate text-caption text-text-muted">{item.leagueName}</div>
                        </div>
                      </AutocompleteItem>
                    )}
                  </AutocompleteCollection>
                </AutocompleteGroup>
              )}
            </AutocompleteList>
          </AutocompleteContent>
        </Autocomplete>
      </div>
      <p className="mt-2 text-data text-text-muted">
        Leave blank if you don&apos;t support a club.
      </p>
    </div>
  );
};
