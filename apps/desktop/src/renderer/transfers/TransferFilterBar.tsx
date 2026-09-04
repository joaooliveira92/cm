import { POSITIONS } from "@cm-clone/shared";
import { Input } from "../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { FOCUS_RING } from "../focus.js";
import type { FilterClause } from "../table/types.js";
import {
  nameSearchClause,
  positionClause,
  upsertFilter,
} from "../table/features/filtering.js";

const SELECT_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;

/** Shared composable filter bar for the transfers tables (Market + Free Agents).
 *  Replaces the old boolean-gated inline controls with explicit composition:
 *  the caller owns the filter state and passes it here; this component owns
 *  only the presentation. */
export const TransferFilterBar = ({
  label,
  filters,
  onSetFilters,
}: {
  readonly label: string;
  readonly filters: readonly FilterClause[];
  readonly onSetFilters: (filters: readonly FilterClause[]) => void;
}) => {
  const nameQuery =
    filters.find((f) => f._tag === "nameSearch")?._tag === "nameSearch"
      ? (filters.find((f) => f._tag === "nameSearch") as { readonly query: string }).query
      : "";
  const activePosition = filters.find((f) => f._tag === "position")?.position;

  const setNameQuery = (query: string): void => {
    if (query.trim() === "") {
      onSetFilters(filters.filter((f) => f._tag !== "nameSearch"));
    } else {
      onSetFilters(upsertFilter(filters, nameSearchClause(query)));
    }
  };
  const setPosition = (position: string): void => {
    onSetFilters(
      position === ""
        ? filters.filter((f) => f._tag !== "position")
        : upsertFilter(filters, positionClause(position)),
    );
  };

  return (
    <>
      <label className="flex items-center gap-2 text-text-body">
        Name
        <Input
          type="text"
          aria-label={`Search ${label} by name`}
          value={nameQuery}
          onChange={(event) => setNameQuery(event.target.value)}
          className="w-32"
        />
      </label>
      <div className="flex items-center gap-2 text-text-body">
        Position
        <Select
          value={activePosition ?? ""}
          onValueChange={(value) => {
            if (value !== null) setPosition(value);
          }}
        >
          <SelectTrigger aria-label={`Filter ${label} by position`} className={SELECT_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All positions</SelectItem>
            {POSITIONS.map((position) => (
              <SelectItem key={position} value={position}>
                {position}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
};
