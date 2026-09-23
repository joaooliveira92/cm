/**
 * Club Squad (Screen 35): any club's squad, read-only.
 *
 * The club-scoped sibling of the own-club Squad screen, which is a lineup manager — selection,
 * drag, lineup edits, the match-day bar. This is the roster half of that surface, rendered bare
 * per the club-scoped rule's act-versus-read discriminator: the shared `SquadRoster` mounts the
 * same columns both surfaces draw, and the own-club screen alone wraps it in the editing surface.
 *
 * Its Players read by the human club's Scouting Progress on the shared knowledge rule (Agent Note
 * 2026-09-19, tickets 09/10): exact figures for the manager's own club — if this route is reached
 * for it — and for rivals only once Fully Scouted; Attribute Ranges below that. The player each
 * name opens is the same knowledge-limited Player read every other surface opens.
 *
 * One read answers all three states (loading / ready / failed, where an unknown club is
 * `ClubNotFoundError`, never a redirect), carrying whose club it is so the foreign marker is not a
 * second read to reconcile. Same shape as `ClubStaffScreen`, deliberately.
 */
import { useCallback, useMemo } from "react";
import type { ClubId, SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import {
  clubSquadAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";
import { SquadRoster } from "../squad/SquadRoster.js";
import { clubSquadRowOf } from "../table/squad/squadColumns.js";
import { useClubSquadRoster } from "./useClubSquadRoster.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The sentence a failed read shows. A defect-only cause carries no typed error, so it falls back
 *  to the generic line; an unknown club or missing save always carries its own sentence. */
const messageOf = (error: RpcClientError<"getClubSquad"> | null): string =>
  error === null ? "Club squad could not be loaded." : describeRpcError(error);

/** The non-`ready` states, on the surface every one of them renders on: a labelled `<main>` region
 *  carrying one line. Labelled rather than heading-labelled because neither state knows the club's
 *  name — that arrives with the view. */
const ClubSquadMessage = ({ message }: { readonly message: string }) => (
  <main
    className={PAGE_CLASS}
    tabIndex={-1}
    data-focus-id="clubSquad"
    aria-label="Club Squad"
  >
    <h1 className="text-2xl font-bold">Club Squad</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

export const ClubSquadScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const squadResult = useAtomValue(clubSquadAtom(saveId, clubId));
  const loaded = squadResult._tag === "Success" ? squadResult.value : null;

  // The roster hook and the navigation callbacks run on every render (loading, ready and failed
  // alike) so the hook count never changes; before the view lands there are simply no rows to
  // draw and no player to open.
  const rows = useMemo(() => (loaded?.players ?? []).map(clubSquadRowOf), [loaded]);
  const roster = useClubSquadRoster(rows);
  const playerIds = useMemo(() => loaded?.players.map((player) => player.id) ?? [], [loaded]);

  /** The name cell and the row's primary action both open the player's profile — a read, on the
   *  same knowledge-limited Player read every other surface opens. */
  const openPlayer = useCallback(
    (id: string, event: React.MouseEvent) => {
      const playerId = playerIds.find((candidate) => candidate === id);
      if (playerId === undefined) return;
      navigateCareer({ type: "playerDetail", saveId, playerId }, intentOfClick(event));
    },
    [saveId, playerIds],
  );
  const onRowPrimary = useCallback(
    (id: string) => {
      const playerId = playerIds.find((candidate) => candidate === id);
      if (playerId === undefined) return;
      navigateCareer({ type: "playerDetail", saveId, playerId }, "keyboard");
    },
    [saveId, playerIds],
  );

  if (squadResult._tag === "Failure") {
    return <ClubSquadMessage message={messageOf(typedError(squadResult))} />;
  }
  if (squadResult._tag !== "Success") {
    return <ClubSquadMessage message="Loading club squad..." />;
  }
  // From here on `squadResult` is the Success variant and only `view` is a value.
  const view = squadResult.value;

  return (
    <main
      tabIndex={-1}
      data-focus-id="clubSquad"
      aria-labelledby="club-squad-heading"
      className={PAGE_CLASS}
    >
      <header>
        {/* The club header is the `<main>` region's label, so the first thing read is which club's
            squad this is — and the foreign marker when that club is not the user's. */}
        <h1 id="club-squad-heading" className="text-2xl font-bold">
          {view.club.name} · Squad{" "}
          {!view.isUserClub && (
            <span className="text-sm font-semibold text-text-secondary">[Not your club]</span>
          )}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {view.players.length} {view.players.length === 1 ? "player" : "players"}
        </p>
      </header>

      {view.players.length === 0 ? (
        <p className="mt-8 text-text-secondary italic">This club has no players.</p>
      ) : (
        <section className="mt-3 rounded-panel bg-panel-bg px-3 pt-2 pb-3">
          <h2 className="text-base font-bold text-text-highlight">Players</h2>
          <SquadRoster
            table={roster.table}
            orderedIds={roster.orderedIds}
            tableId="club-squad"
            screen="clubSquad"
            region="clubSquadTable"
            activeId={roster.activeId}
            onActiveChange={roster.onActiveChange}
            onBookmarkChange={roster.onBookmarkChange}
            selectedId={null}
            onToggleSelection={() => undefined}
            onSortChange={() => undefined}
            onIdentityOpen={openPlayer}
            onRowPrimary={onRowPrimary}
            ariaLabel="Squad"
            announcement=""
          />
        </section>
      )}
    </main>
  );
};