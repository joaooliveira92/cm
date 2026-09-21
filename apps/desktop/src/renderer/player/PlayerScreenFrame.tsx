/**
 * The chrome every player surface shares: the player's identity, shown in the career navbar, and
 * the tab strip across the player-scoped routes.
 *
 * CM 03/04 drew one player screen with a fixed header — number, name, club, then the position /
 * nationality / age line — and switched only the body between Profile, Information, Form and
 * History. This frame is that header (lifted into the navbar) and that strip; each route owns only its panels. Keeping it
 * here rather than in each screen is what makes "the player you clicked" stay legible while you
 * move between the tabs.
 *
 * The frame owns the profile read's three view states, so a screen inside it renders against a
 * loaded `PlayerProfileView` and never repeats the loading/error arms. A screen needing more than
 * the profile (the Information tab's contract, say) reads its own atom inside the children.
 */
import type { PlayerId, PlayerProfileView, SaveId } from "@cm-clone/contracts";
import { nationName } from "@cm-clone/shared";
import { useEffect, type ReactNode } from "react";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { setScreenIdentity } from "../screenIdentity.js";
import { injuryLabel } from "./injury.js";
import { describeRpcError, playerContractAtom, playerProfileAtom, typedError, useAtomValue } from "../rpc.js";

const PAGE_CLASS = `flex flex-1 flex-col bg-background px-4 pt-3 pb-6 text-foreground ${FOCUS_RING.join(" ")}`;

/** The player-scoped routes, in the order the strip draws them. `Form` and `History` are absent
 *  rather than disabled: neither per-player match form nor career history is modelled (Group D
 *  tickets 04/53/55), so a tab for them would name a screen that cannot exist yet. */
const TABS = [
  { id: "playerProfile", label: "Profile", destination: "playerDetail" },
  { id: "playerContract", label: "Information", destination: "playerContract" },
  { id: "playerDevelopment", label: "Development", destination: "playerDevelopment" },
] as const;

export type PlayerTabId = (typeof TABS)[number]["id"];

const TAB_BASE_CLASS = `flex-1 rounded-control px-3 py-1.5 text-center text-sm font-semibold transition-colors ${FOCUS_RING.join(" ")}`;

const PlayerTabStrip = ({
  saveId,
  playerId,
  active,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly active: PlayerTabId;
}) => (
  <nav aria-label="Player sections" className="flex gap-1 rounded-panel bg-panel-bg p-1">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        aria-current={tab.id === active ? "page" : undefined}
        className={`${TAB_BASE_CLASS} ${
          tab.id === active
            ? "bg-surface-raised text-text-highlight"
            : "text-text-secondary hover:bg-surface hover:text-text-primary"
        }`}
        onClick={(event) => {
          if (tab.id === active) return;
          navigateCareer(
            { type: tab.destination, saveId, playerId },
            intentOfClick(event),
          );
        }}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

/** "DC, DR" — every Position the player can fill, in the order the read carries them. */
export const positionsLine = (profile: PlayerProfileView): string =>
  profile.positions.length === 0
    ? "No recorded position"
    : profile.positions.map((entry) => entry.position).join(", ");

/** CM's banner — name and club, the facts line beneath — drawn in the career navbar's identity
 *  slot, with the player's standing facts in the band below it, for as long as the player screen
 *  is mounted. The wage comes from the contract read, so it fills in once that resolves. */
const usePlayerIdentity = (profile: PlayerProfileView | null, wage: number | null): void => {
  useEffect(() => {
    if (profile === null) return;
    setScreenIdentity({
      name: `${profile.firstName} ${profile.lastName}`,
      qualifier: profile.club.name,
      facts: `${positionsLine(profile)}, ${nationName(profile.nationality)}, Age ${profile.age}`,
      player: {
        overallRating: profile.overallRating,
        transferValue: profile.transferValue,
        wage,
        contractExpiry: profile.contractExpiry,
        injury: injuryLabel(profile.injuryStatus),
      },
    });
    return () => setScreenIdentity(null);
  }, [profile, wage]);
};

/**
 * Wrap one player-scoped screen in the shared header and tab strip.
 *
 * `children` is a function of the loaded profile rather than a node so a screen cannot render its
 * panels before the read resolves — the type makes the ready state the only one it sees.
 */
export const PlayerScreenFrame = ({
  saveId,
  playerId,
  tab,
  children,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly tab: PlayerTabId;
  readonly children: (profile: PlayerProfileView) => ReactNode;
}) => {
  const profileResult = useAtomValue(playerProfileAtom(saveId, playerId));
  const contractResult = useAtomValue(playerContractAtom(saveId, playerId));
  usePlayerIdentity(
    profileResult._tag === "Success" ? profileResult.value : null,
    contractResult._tag === "Success" ? contractResult.value.wage : null,
  );

  // One <main> for every state, so the element the focus coordinator focused on arrival is still the
  // one on screen once the profile loads; swapping in a new element dropped focus to <body>, and the
  // keyboard spine with it.
  const profile = profileResult._tag === "Success" ? profileResult.value : null;
  const error = typedError(profileResult);
  const message =
    profileResult._tag === "Initial"
      ? "Loading player data..."
      : error === null
        ? "Player could not be loaded."
        : describeRpcError(error);
  const name = profile === null ? "Player" : `${profile.firstName} ${profile.lastName}`;
  const tabLabel = TABS.find((entry) => entry.id === tab)?.label ?? "";

  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id={tab}
      aria-label={name}
      aria-busy={profileResult._tag === "Initial" ? true : undefined}
    >
      {profile === null ? (
        <>
          <h1 className="text-xl font-bold">Player</h1>
          <p className="mt-4 text-text-secondary">{message}</p>
        </>
      ) : (
        <>
          {/* Every career screen owns its section <h1> (career chrome note). The player's name is
              shown in the navbar, so the heading is for assistive technology only, as on Squad. */}
          <h1 className="sr-only">{`${name} — ${tabLabel}`}</h1>
          <PlayerTabStrip saveId={saveId} playerId={playerId} active={tab} />
          {children(profile)}
        </>
      )}
    </main>
  );
};
