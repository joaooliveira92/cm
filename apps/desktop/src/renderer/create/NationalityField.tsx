import { NationId } from "@cm-clone/contracts";
import { NATION_CODES, NATION_PROFILES, canonicalNationId } from "@cm-clone/shared";
import { Autocomplete as AutocompletePrimitive } from "@base-ui/react/autocomplete";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "../components/ui/autocomplete.js";
import { Label } from "../components/ui/label.js";

interface Nationality {
  readonly id: NationId;
  readonly name: string;
}

/** The world's nations, which generation copies into every save, so the picker never has to wait
 *  on the world to offer an answer. Names are factual geography read from code, not a content pack. */
const NATIONALITIES: ReadonlyArray<Nationality> = NATION_CODES.map((code) => ({
  id: NationId.make(canonicalNationId(code)),
  name: NATION_PROFILES[code].displayName,
}));

const nameOf = (id: NationId | null): string =>
  NATIONALITIES.find((nation) => nation.id === id)?.name ?? "";

/**
 * The manager's nationality: an autocomplete over the catalogue's nations.
 *
 * As in `FavoriteTeamField`, the input is free text and the pick lives in `value`: typing only
 * filters, closing the list without picking puts the chosen name back, and clearing the input
 * clears the pick.
 */
export const NationalityField = ({
  value,
  onSelect,
}: {
  readonly value: NationId | null;
  readonly onSelect: (nationalityId: NationId | null) => void;
}) => {
  const [query, setQuery] = useState(nameOf(value));
  // Read when the list closes — an item press closes it before `value` comes back round.
  const committedName = useRef(nameOf(value));

  useEffect(() => {
    committedName.current = nameOf(value);
    setQuery(nameOf(value));
  }, [value]);

  const { contains } = AutocompletePrimitive.useFilter({ sensitivity: "base" });

  // The committed name is a display, not a search: reopening over it lists every nation.
  const filtered = useMemo(
    () =>
      query === "" || query === nameOf(value)
        ? NATIONALITIES
        : NATIONALITIES.filter((nation) => contains(nation.name, query)),
    [query, value, contains],
  );

  return (
    <div>
      <Label className="block">Nationality</Label>
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
          itemToStringValue={(item: unknown) => (item as Nationality).name}
          filter={null}
          openOnInputClick
        >
          <AutocompleteInput
            aria-label="Nationality"
            placeholder="Select a nationality"
            showClear={value !== null}
            showTrigger
          />
          <AutocompleteContent>
            <AutocompleteEmpty>No nation found.</AutocompleteEmpty>
            <AutocompleteList>
              {(nation: Nationality) => (
                <AutocompleteItem
                  key={nation.id}
                  value={nation}
                  aria-selected={nation.id === value}
                  className="aria-selected:font-semibold"
                  onClick={() => {
                    committedName.current = nation.name;
                    onSelect(nation.id);
                  }}
                >
                  {nation.name}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompleteContent>
        </Autocomplete>
      </div>
    </div>
  );
};
