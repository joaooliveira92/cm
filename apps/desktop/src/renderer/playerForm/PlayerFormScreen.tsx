/**
 * Player Form (map ticket 19): the Form tab in the player strip.
 *
 * The recent games the player's club has played this season, newest first, cut at the later of the
 * season's start and the day he joined; the five-rating form strip above them. Each row is one of
 * four states — played, "Unused substitute", "Not selected" or "No player record" — and a row for
 * the user's own fixture opens its Match Report. The read is `getPlayerForm`; the season block
 * arrives with ticket 20.
 */
import type { ClubId, PlayerFormGameRow, PlayerFormView, PlayerId, SaveId } from "@cm-clone/contracts";
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

/** The stats columns, in CM order: abbreviation, full name, and how to read the value. Ticket 18
 *  inserts the recorded-defending columns between Key and Off. */
const COLUMNS: ReadonlyArray<{
  readonly short: string;
  readonly full: string;
  readonly value: (row: PlayerFormGameRow) => string;
  readonly rating?: boolean;
  readonly goalkeeper?: boolean;
}> = [
  { short: "Key", full: "Key passes", value: (row) => String(row.keyPasses) },
  { short: "Off", full: "Offsides", value: (row) => String(row.offsides) },
  { short: "Fou", full: "Fouls committed", value: (row) => String(row.fouls) },
  { short: "Ast", full: "Assists", value: (row) => String(row.assists) },
  { short: "She", full: "Shots", value: (row) => String(row.shots) },
  { short: "Sat", full: "Shots on target", value: (row) => String(row.shotsOnTarget) },
  { short: "Sav", full: "Saves", value: (row) => String(row.saves), goalkeeper: true },
  {
    short: "Rat",
    full: "Match Rating",
    value: (row) => (row.rating === null ? "" : row.rating.toFixed(1)),
    rating: true,
  },
  { short: "Gls", full: "Goals", value: (row) => String(row.goals) },
];

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
    <table className="min-w-full text-left text-data">
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
            <th key={column.short} scope="col">
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
                  {columns.map((column) => (
                    <td key={column.short} className="tabular-nums">
                      {column.rating === true && row.rating !== null ? (
                        <span className={`font-semibold ${ratingTone(row.rating)}`}>
                          {column.value(row)}
                        </span>
                      ) : (
                        column.value(row)
                      )}
                    </td>
                  ))}
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
