/**
 * Club Fixtures (Screen 40): any club's fixtures this Season, across every Competition it plays in.
 *
 * The club-scoped sibling of `FixturesScreen`, which is the manager's own calendar. Both render
 * `FixtureDayList` — one list implementation, two ways in — per
 * [the club-scoped rule](../../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).
 *
 * A club with no fixtures is an ordinary empty state, not an error: a `results-only` club plays no
 * dated fixtures at all. An unknown club fails, so the two cannot be confused.
 */
import { type ClubId, type SaveId } from "@cm-clone/contracts";
import { FixtureDayList } from "../fixtures/FixtureDayList.js";
import { FOCUS_RING } from "../focus.js";
import {
  clubFixturesAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getClubFixtures"> | null): string =>
  error === null ? "Club fixtures could not be loaded." : describeRpcError(error);

const ClubFixturesMessage = ({ message }: { readonly message: string }) => (
  <main tabIndex={-1} data-focus-id="clubFixturesDetail" aria-label="Club Fixtures" className={PAGE_CLASS}>
    <h1 className="text-2xl font-bold">Club Fixtures</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

export const ClubFixturesDetailScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const result = useAtomValue(clubFixturesAtom(saveId, clubId));

  if (result._tag === "Failure") return <ClubFixturesMessage message={messageOf(typedError(result))} />;
  if (result._tag !== "Success") return <ClubFixturesMessage message="Loading club fixtures..." />;

  const view = result.value;

  return (
    <main tabIndex={-1} data-focus-id="clubFixturesDetail" aria-label="Club Fixtures" className={PAGE_CLASS}>
      <h1 className="text-2xl font-bold">{view.club.name}</h1>
      {/* The route carries any club, so the page says whose it is rather than leaving the reader
          to assume — the same marker `ClubStaffScreen` uses. */}
      {view.isUserClub ? null : <p className="mt-1 text-sm text-text-secondary">[Not your club]</p>}
      <p className="mt-1 text-sm text-text-secondary">
        Season {view.season.seasonNumber} &middot; {view.fixtures.length} fixtures
      </p>

      {view.fixtures.length === 0 ? (
        <p className="mt-8 text-text-secondary italic">This club has no fixtures this season.</p>
      ) : (
        <FixtureDayList fixtures={view.fixtures} />
      )}
    </main>
  );
};
