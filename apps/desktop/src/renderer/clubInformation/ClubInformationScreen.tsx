/**
 * Club General Information (Screen 34): a club's identity, home town, nation and ground, for any
 * club in the save.
 *
 * **Short by design.** The import asks for ownership, reputation, finances, facilities, history and
 * more; of those only the ground and the club's standing have a model in this game. The rest is
 * `deferred` in the
 * [Group C ledger](../../../../docs/specs/group_c_club_information/RECONCILIATION.md), not stubbed
 * here — a screen showing an invented figure is worse than a placeholder, because a reader cannot
 * tell it from one that is right.
 *
 * Screen 46's facilities do not exist either, and the ground is the part of 46 that folds in here;
 * this is where a reader looking for a stadium finds one.
 *
 * Three states, like `ClubStaffScreen`: `loading`, `ready`, `error`. One read answers the whole
 * page including whose club it is, so there is no state where the page knows the ground but not
 * the owner.
 */
import { type ClubId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";
import {
  clubInformationAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** The heading each Stature Tier reads as, so nobody infers standing from a raw enum value. */
const STATURE_LABELS: Readonly<Record<"big" | "mid" | "small", string>> = {
  big: "Major club",
  mid: "Established club",
  small: "Small club",
};

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getClubInformation"> | null): string =>
  error === null ? "Club information could not be loaded." : describeRpcError(error);

const ClubInformationMessage = ({ message }: { readonly message: string }) => (
  <main
    tabIndex={-1}
    data-focus-id="clubInformation"
    aria-label="Club Information"
    className={PAGE_CLASS}
  >
    <h1 className="text-2xl font-bold">Club Information</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

/** One labelled fact. A definition list rather than a table: these are properties of one club, not
 *  rows of a collection, and a screen reader should hear the pairing. */
const Fact = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex gap-2">
    <dt className="text-text-secondary">{label}</dt>
    <dd className="font-medium">{value}</dd>
  </div>
);

export const ClubInformationScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const result = useAtomValue(clubInformationAtom(saveId, clubId));

  if (result._tag === "Failure") {
    return <ClubInformationMessage message={messageOf(typedError(result))} />;
  }
  if (result._tag !== "Success") {
    return <ClubInformationMessage message="Loading club information..." />;
  }

  const view = result.value;

  return (
    <main
      tabIndex={-1}
      data-focus-id="clubInformation"
      aria-label="Club Information"
      className={PAGE_CLASS}
    >
      <h1 className="text-2xl font-bold">{view.club.name}</h1>
      {/* The same marker ClubStaffScreen uses, for the same reason: the route carries any club, so
          the page has to say whose it is rather than leave the reader to assume. */}
      {view.isUserClub ? null : (
        <p className="mt-1 text-sm text-text-secondary">[Not your club]</p>
      )}

      <dl className="mt-6 space-y-2 text-sm">
        <Fact label="Standing" value={STATURE_LABELS[view.club.statureTier]} />
        <Fact label="Town" value={view.cityName} />
        <Fact label="Nation" value={view.nationName} />
        <Fact label="Ground" value={view.stadiumName} />
        <Fact
          label="Capacity"
          value={new Intl.NumberFormat().format(view.stadiumCapacity)}
        />
      </dl>
    </main>
  );
};
