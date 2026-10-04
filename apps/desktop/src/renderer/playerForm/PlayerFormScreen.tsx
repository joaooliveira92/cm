/**
 * Player Form (map ticket 19): the Form tab in the player strip.
 *
 * The recent games the player's club has played this season, newest first, cut at the later of the
 * season's start and the day he joined; the five-rating form strip above them. Each row is one of
 * four states — played, "Unused substitute", "Not selected" or "No player record" — and a row for
 * the user's own fixture opens its Match Report. Below them the season block totals the season by
 * competition. The read is `getPlayerForm`.
 */
import type { ClubId, PlayerFormGameRow, PlayerFormSeasonRow, PlayerFormView, PlayerId, SaveId } from "@cm-clone/contracts";
import { useState } from "react";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { AbbrHeader } from "../match/playerLineColumns.js";
import { ratingTone } from "../match/ratingTone.js";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { PlayerScreenFrame } from "../player/PlayerScreenFrame.js";
import { describeRpcError, playerFormAtom, typedError, useAtomValue } from "../rpc.js";

const STATE_TEXT: Readonly<Record<PlayerFormGameRow["state"], string>> = {
  played: "",
  unusedSubstitute: "Unused substitute",
  notSelected: "Not selected",
  noRecord: "No player record",
};

/** The stats columns, in CM order, matching the Home/Away Stats table. Ticket 18's
 *  recorded-defending columns read "-" on a row from a timeline stored before the events existed. */
const COLUMNS: ReadonlyArray<{
  readonly id: string;
  readonly short: string;
  readonly full: string;
  readonly value: (row: PlayerFormGameRow) => string | null;
  readonly rating?: boolean;
  readonly goalkeeper?: boolean;
}> = [
  { id: "keyPasses", short: "Key", full: "Key passes", value: (row) => String(row.keyPasses) },
  { id: "tacklesAttempted", short: "Tck", full: "Tackles attempted", value: (row) => nullable(row.tacklesAttempted) },
  { id: "tacklesWon", short: "Won", full: "Tackles won", value: (row) => nullable(row.tacklesWon) },
  { id: "headers", short: "Hea", full: "Headers attempted", value: (row) => nullable(row.headers) },
  { id: "headersWon", short: "Won", full: "Headers won", value: (row) => nullable(row.headersWon) },
  { id: "interceptions", short: "Int", full: "Interceptions", value: (row) => nullable(row.interceptions) },
  { id: "runs", short: "Run", full: "Runs", value: (row) => nullable(row.runs) },
  { id: "offsides", short: "Off", full: "Offsides", value: (row) => String(row.offsides) },
  { id: "fouls", short: "Fou", full: "Fouls committed", value: (row) => String(row.fouls) },
  { id: "foulsSuffered", short: "Fld", full: "Fouls suffered", value: (row) => nullable(row.foulsSuffered) },
  { id: "assists", short: "Ast", full: "Assists", value: (row) => String(row.assists) },
  { id: "shots", short: "She", full: "Shots", value: (row) => String(row.shots) },
  { id: "shotsOnTarget", short: "Sat", full: "Shots on target", value: (row) => String(row.shotsOnTarget) },
  { id: "saves", short: "Sav", full: "Saves", value: (row) => String(row.saves), goalkeeper: true },
  {
    id: "rating",
    short: "Rat",
    full: "Match Rating",
    value: (row) => (row.rating === null ? null : row.rating.toFixed(1)),
    rating: true,
  },
  { id: "goals", short: "Gls", full: "Goals", value: (row) => String(row.goals) },
];

/** A count that may be absent (a pre-change timeline): "-" when played, empty when not. */
const nullable = (value: number | null): string | null => (value === null ? "-" : String(value));

const CardMark = ({ row }: { readonly row: PlayerFormGameRow }) => {
  if (row.card === "none") return null;
  const label = row.card === "red" ? "Sent off" : "Booked";
  return (
    <span role="img" aria-label={label} title={label}>
      <span
        aria-hidden="true"
        className={`inline-block h-3 w-2 rounded-[2px] ${row.card === "red" ? "bg-[#dc2626]" : "bg-[#facc15]"}`}
      />
    </span>
  );
};

const substitutionNote = (row: PlayerFormGameRow): string => {
  const parts: Array<string> = [];
  if (row.cameOnMinute !== null) parts.push(`on ${row.cameOnMinute}'`);
  if (row.wentOffMinute !== null) parts.push(`off ${row.wentOffMinute}'`);
  return parts.join(", ");
};

const FormTable = ({
  view,
  onOpenReport,
}: {
  readonly view: PlayerFormView;
  readonly onOpenReport: (matchId: NonNullable<PlayerFormGameRow["matchId"]>, event: React.MouseEvent) => void;
}) => {
  const columns = COLUMNS.filter((column) => column.goalkeeper !== true || view.goalkeeper);
  return (
    <table aria-label="Recent games" className="min-w-full text-left text-data">
      <caption className="text-text-muted">Only what the match records is shown.</caption>
      <thead>
        <tr>
          <th scope="col">Date</th>
          <th scope="col">Opponent</th>
          <th scope="col">
            <AbbrHeader short="C." full="Card" />
          </th>
          <th scope="col">
            <AbbrHeader short="Inf." full="Substitution" />
          </th>
          {columns.map((column) => (
            <th key={column.id} scope="col">
              <AbbrHeader short={column.short} full={column.full} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {view.games.map((row) => {
          const stateText = STATE_TEXT[row.state];
          const played = row.state === "played";
          return (
            <tr key={row.fixtureId} className={played ? "" : "text-text-muted"}>
              <td>{row.date}</td>
              <td>
                {row.matchId === null ? (
                  row.opponentClubName
                ) : (
                  <button
                    type="button"
                    className={`rounded-control text-left underline ${FOCUS_RING.join(" ")}`}
                    onClick={(event) => onOpenReport(row.matchId!, event)}
                  >
                    {row.opponentClubName}
                  </button>
                )}
                {row.isHome ? "" : " (a)"}
              </td>
              {played ? (
                <>
                  <td>
                    <CardMark row={row} />
                  </td>
                  <td>{substitutionNote(row)}</td>
                  {columns.map((column) => {
                    const text = column.value(row);
                    return (
                      <td key={column.id} className="tabular-nums">
                        {column.rating === true && row.rating !== null ? (
                          <span className={`font-semibold ${ratingTone(row.rating)}`}>{text}</span>
                        ) : (
                          text
                        )}
                      </td>
                    );
                  })}
                </>
              ) : (
                <td colSpan={2 + columns.length}>{stateText}</td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const shotTargetPct = (row: PlayerFormSeasonRow): string =>
  row.shots === 0 ? "-" : `${Math.round((row.shotsOnTarget / row.shots) * 100)}%`;

const SeasonBlock = ({ rows }: { readonly rows: ReadonlyArray<PlayerFormSeasonRow> }) => (
  <section className="space-y-2" aria-label="Season totals">
    <h2 className="text-heading text-text-highlight">Season</h2>
    <table className="min-w-full text-left text-data">
      <thead>
        <tr>
          <th scope="col">Competition</th>
          <th scope="col">
            <AbbrHeader short="Apps" full="Appearances (starts (sub))" />
          </th>
          <th scope="col">
            <AbbrHeader short="Gls" full="Goals" />
          </th>
          <th scope="col">
            <AbbrHeader short="Asts" full="Assists" />
          </th>
          <th scope="col">
            <AbbrHeader short="MoM" full="Player of the Match" />
          </th>
          <th scope="col">
            <AbbrHeader short="Yel" full="Yellow cards" />
          </th>
          <th scope="col">
            <AbbrHeader short="Red" full="Red cards" />
          </th>
          <th scope="col">
            <AbbrHeader short="Tck" full="Tackles attempted" />
          </th>
          <th scope="col">
            <AbbrHeader short="Sh Tar" full="Shots on target %" />
          </th>
          <th scope="col">
            <AbbrHeader short="Fouls" full="Fouls committed" />
          </th>
          <th scope="col">
            <AbbrHeader short="Fls Ag" full="Fouls suffered" />
          </th>
          <th scope="col">
            <AbbrHeader short="Av R" full="Average Match Rating" />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.kind}>
            <th scope="row" className="text-left font-normal">
              {row.label}
            </th>
            <td className="tabular-nums">{`${row.starts} (${row.subs})`}</td>
            <td className="tabular-nums">{row.goals}</td>
            <td className="tabular-nums">{row.assists}</td>
            <td className="tabular-nums">{row.mom}</td>
            <td className="tabular-nums">{row.yellowCards}</td>
            <td className="tabular-nums">{row.redCards}</td>
            <td className="tabular-nums">{row.tackles === null ? "-" : row.tackles}</td>
            <td className="tabular-nums">{shotTargetPct(row)}</td>
            <td className="tabular-nums">{row.fouls}</td>
            <td className="tabular-nums">{row.foulsSuffered === null ? "-" : row.foulsSuffered}</td>
            <td className="tabular-nums">{row.averageRating === null ? "-" : row.averageRating.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

const FormBody = ({
  view,
  saveId,
  active,
  onSelect,
}: {
  readonly view: PlayerFormView;
  readonly saveId: SaveId;
  readonly active: ClubId | null;
  readonly onSelect: (clubId: ClubId) => void;
}) => (
  <div className="mt-3 space-y-4">
    <div className="rounded-panel bg-panel-bg px-3 pt-2 pb-3">
      <h2 className="text-heading text-text-highlight">Form</h2>
      <p className="mt-1 text-body">
        {view.formRatings.length === 0
          ? "Form: no appearances"
          : `Form: ${view.formRatings.map((rating) => Math.round(rating)).join(" ")}`}
      </p>
    </div>
    {view.clubs.length > 1 && (
      <div aria-label="Team" className="flex flex-wrap gap-1">
        {view.clubs.map((club) => (
          <Button
            key={club.clubId}
            type="button"
            variant={club.clubId === active ? "default" : "secondary"}
            size="sm"
            aria-pressed={club.clubId === active}
            onClick={() => onSelect(club.clubId)}
          >
            {club.clubName}
          </Button>
        ))}
      </div>
    )}
    <FormTable
      view={view}
      onOpenReport={(matchId, event) =>
        navigateCareer({ type: "matchReport", saveId, matchId }, intentOfClick(event))
      }
    />
    <SeasonBlock rows={view.season} />
  </div>
);

export const PlayerFormScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => (
  <PlayerScreenFrame saveId={saveId} playerId={playerId} tab="playerForm">
    {() => <PlayerFormPanels saveId={saveId} playerId={playerId} />}
  </PlayerScreenFrame>
);

/** The read is separate from the frame so it can re-key on the Team selector: the selector's choice
 *  lives here, above the atom, and a change reads the other club's rows. */
const PlayerFormPanels = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const [clubId, setClubId] = useState<ClubId | null>(null);
  const result = useAtomValue(playerFormAtom(saveId, playerId, clubId));

  if (result._tag === "Initial") {
    return <p className="mt-3 text-text-secondary italic">Loading form...</p>;
  }
  if (result._tag === "Failure") {
    const error = typedError(result);
    return (
      <Alert variant="destructive" className="mt-3">
        {error === null ? "Form could not be loaded." : describeRpcError(error)}
      </Alert>
    );
  }
  return (
    <FormBody
      view={result.value}
      saveId={saveId}
      active={clubId ?? result.value.selectedClubId}
      onSelect={setClubId}
    />
  );
};
