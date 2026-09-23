/**
 * Player Search (Screen 119): the manager searches every Player in the save — by name, age
 * range, position, nationality or club — and the results read by the human club's Scouting
 * Progress under the shared knowledge rule (Agent Note 2026-09-19, tickets 09-11):
 *
 * - the manager's own Players and a Fully Scouted rival read exact figures;
 * - every other rival or Free Agent reads an Attribute Range, narrower as the club has scouted
 *   them and never wider, exact only at Fully Scouted;
 * - opening a result lands on that Player's Profile, the same knowledge-limited read.
 *
 * The search is committed: results are published for the submitted query, not re-read as the form
 * is typed on, and an empty query asks the read for the whole save (capped at
 * `PLAYER_SEARCH_MAX_RESULTS` rows, its `total` still the true count).
 */
import { useMemo, useState } from "react";
import { NATION_CODES, POSITIONS, canonicalNationId, nationName } from "@cm-clone/shared";
import type { PlayerSearchQuery, SaveId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { Table } from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  describeRpcError,
  playerSearchAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { DataTable } from "../table/DataTable.js";
import { searchRowOf } from "../table/playerSearch/searchColumns.js";
import { usePlayerSearchRoster } from "./usePlayerSearchRoster.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;
const CONTROL_CLASS = `rounded-control border border-border-subtle bg-field-bg px-2 py-1 ${FOCUS_RING.join(" ")}`;

/** The number an age field holds, or `undefined` for an empty/invalid entry — an untidy field is
 *  simply not a filter, rather than an error: the manager typed a draft, not a mistake. */
const parseAge = (text: string): number | undefined => {
  if (text.trim() === "") return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
};

/** The sentence a failed search shows. A defect-only cause carries no typed error, so it falls
 *  back to the generic line; a missing save always carries its own sentence. */
const messageOf = (error: RpcClientError<"getPlayerSearch"> | null): string =>
  error === null ? "The search could not be run." : describeRpcError(error);

/** The results half of the screen, mounted only once a query has been submitted — so an untouched
 *  screen never issues the whole-save read the empty query would. */
const SearchResults = ({
  saveId,
  query,
}: {
  readonly saveId: SaveId;
  readonly query: PlayerSearchQuery;
}) => {
  const searchResult = useAtomValue(playerSearchAtom(saveId, query));
  const loaded = searchResult._tag === "Success" ? searchResult.value : null;

  // The roster hook and the navigation callbacks run on every render (loading, ready and failed
  // alike) so the hook count never changes; before the results land there are simply no rows.
  const rows = useMemo(() => (loaded?.results ?? []).map(searchRowOf), [loaded]);
  const roster = usePlayerSearchRoster(rows);
  const playerIds = useMemo(() => loaded?.results.map((result) => result.id) ?? [], [loaded]);

  /** The name cell and the row's primary action both open the player's profile — the same
   *  knowledge-limited Player read the results just published. */
  const openPlayer = (id: string, event: React.MouseEvent) => {
    const playerId = playerIds.find((candidate) => candidate === id);
    if (playerId === undefined) return;
    navigateCareer({ type: "playerDetail", saveId, playerId }, intentOfClick(event));
  };
  const onRowPrimary = (id: string) => {
    const playerId = playerIds.find((candidate) => candidate === id);
    if (playerId === undefined) return;
    navigateCareer({ type: "playerDetail", saveId, playerId }, "keyboard");
  };

  if (searchResult._tag === "Failure") {
    return <p className="mt-4 text-text-danger">{messageOf(typedError(searchResult))}</p>;
  }
  if (searchResult._tag !== "Success") {
    return <p className="mt-4 text-text-secondary italic">Searching…</p>;
  }

  const view = searchResult.value;
  const renderedRows = roster.table.getRowModel().rows;
  return (
    <>
      <p className="mt-4 text-sm text-text-secondary">
        {view.total > view.results.length
          ? `Showing the first ${view.results.length} of ${view.total} matching players — narrow the search to see the rest.`
          : `${view.total} ${view.total === 1 ? "player" : "players"} match.`}
      </p>

      {view.results.length === 0 ? (
        <p className="mt-8 text-text-secondary italic">No players match these filters.</p>
      ) : (
        <section className="mt-3 rounded-panel bg-panel-bg px-3 pt-2 pb-3">
          <h2 className="text-base font-bold text-text-highlight">Results</h2>
          <DataTable
            tableId="player-search"
            screen="playerSearch"
            region="playerSearchTable"
            table={roster.table}
            orderedIds={roster.orderedIds}
            identityColumnId="name"
            activeId={roster.activeId}
            onActiveChange={roster.onActiveChange}
            onBookmarkChange={roster.onBookmarkChange}
            selectedId={null}
            onToggleSelection={() => undefined}
            onSortChange={roster.onSortChange}
            onIdentityOpen={openPlayer}
            onRowPrimary={onRowPrimary}
            ariaLabel="Search results"
            announcement=""
          >
            {rows.length > 0 && (
              <Table className="min-w-full text-left">
                <DataTable.Header table={roster.table} />
                <DataTable.Body rows={renderedRows} />
              </Table>
            )}
          </DataTable>
        </section>
      )}
    </>
  );
};

export const PlayerSearchScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [nameText, setNameText] = useState("");
  const [clubText, setClubText] = useState("");
  const [minAgeText, setMinAgeText] = useState("");
  const [maxAgeText, setMaxAgeText] = useState("");
  const [position, setPosition] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [submitted, setSubmitted] = useState<PlayerSearchQuery | null>(null);

  const minAge = parseAge(minAgeText);
  const maxAge = parseAge(maxAgeText);
  const invalidRange = minAge !== undefined && maxAge !== undefined && minAge > maxAge;

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (invalidRange) return;
    const query: PlayerSearchQuery = {
      ...(nameText.trim() !== "" ? { name: nameText.trim() } : {}),
      ...(minAge !== undefined ? { minAge } : {}),
      ...(maxAge !== undefined ? { maxAge } : {}),
      ...(position !== "" ? { position: position as PlayerSearchQuery["position"] } : {}),
      ...(nationality !== "" ? { nationality } : {}),
      ...(clubText.trim() !== "" ? { clubName: clubText.trim() } : {}),
    };
    setSubmitted(query);
  };

  return (
    <main
      tabIndex={-1}
      data-focus-id="playerSearch"
      aria-label="Player Search"
      className={PAGE_CLASS}
    >
      <header>
        <h1 className="text-2xl font-bold">Player Search</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Search every Player in the world by the filters below. A Player outside your squad reads
          how far your club's scouting has got on them — exact only once Fully Scouted.
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        className="mt-4 flex flex-wrap items-end gap-4 rounded-panel bg-panel-bg px-4 py-3"
      >
        <label className="flex items-center gap-2 text-text-body">
          Name
          <Input
            type="text"
            aria-label="Player name"
            value={nameText}
            onChange={(event) => setNameText(event.target.value)}
            className="w-40"
            placeholder="Any name"
          />
        </label>
        <div className="flex items-center gap-2 text-text-body">
          Age
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Minimum age"
            value={minAgeText}
            onChange={(event) => setMinAgeText(event.target.value)}
            className="w-16"
            placeholder="Any"
          />
          <span aria-hidden="true">to</span>
          <Input
            type="number"
            inputMode="numeric"
            aria-label="Maximum age"
            value={maxAgeText}
            onChange={(event) => setMaxAgeText(event.target.value)}
            className="w-16"
            placeholder="Any"
          />
        </div>
        <div className="flex items-center gap-2 text-text-body">
          Position
          <Select
            value={position}
            onValueChange={(value) => {
              if (value !== null) setPosition(value);
            }}
          >
            <SelectTrigger aria-label="Position" className={CONTROL_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All positions</SelectItem>
              {POSITIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-text-body">
          Nationality
          <Select
            value={nationality}
            onValueChange={(value) => {
              if (value !== null) setNationality(value);
            }}
          >
            <SelectTrigger aria-label="Nationality" className={CONTROL_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any nation</SelectItem>
              {NATION_CODES.map((code) => {
                const nationId = canonicalNationId(code);
                return (
                  <SelectItem key={nationId} value={nationId}>
                    {nationName(nationId)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-text-body">
          Club
          <Input
            type="text"
            aria-label="Club name"
            value={clubText}
            onChange={(event) => setClubText(event.target.value)}
            className="w-36"
            placeholder="Any club"
          />
        </label>
        <Button type="submit" variant="default" disabled={invalidRange}>
          Search
        </Button>
      </form>

      {invalidRange && (
        <p role="alert" className="mt-2 text-sm text-text-danger">
          The minimum age cannot be above the maximum age.
        </p>
      )}

      {submitted === null ? (
        <p className="mt-8 text-text-secondary italic">
          Set the filters above and search to see every Player who matches.
        </p>
      ) : (
        <SearchResults saveId={saveId} query={submitted} />
      )}
    </main>
  );
};