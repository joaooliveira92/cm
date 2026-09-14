import { type PlayerId, type SaveId, type PlayerProfileView } from "@cm-clone/contracts";
import { CATEGORIES, type Category } from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError, playerProfileAtom, typedError, useAtomValue, type RpcClientError } from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

const CATEGORY_LABELS: Record<Category, string> = {
  goalkeeping: "Goalkeeping",
  mental: "Mental",
  physical: "Physical",
  technical: "Technical",
};

const INJURY_LABELS: Record<string, string> = {
  fit: "Fit",
  knock: "Knock",
  light: "Injured (Light)",
  medium: "Injured (Medium)",
  severe: "Injured (Severe)",
};

export const PlayerProfileScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const profileResult = useAtomValue(playerProfileAtom(saveId, playerId));

  if (profileResult._tag === "Initial") {
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="playerProfile" aria-label="Player Profile">
        <h1 className="text-2xl font-bold">Player Profile</h1>
        <p className="mt-4 text-text-secondary">Loading player data...</p>
      </main>
    );
  }

  if (profileResult._tag === "Failure") {
    const error = typedError(profileResult);
    const message = error === null ? "Player could not be loaded." : describeRpcError(error);
    return (
      <main className={PAGE_CLASS} tabIndex={-1} data-focus-id="playerProfile" aria-label="Player Profile">
        <h1 className="text-2xl font-bold">Player Profile</h1>
        <p className="mt-4 text-text-secondary">{message}</p>
      </main>
    );
  }

  const profile = profileResult.value;

  const topAttributes = CATEGORIES.map((category) => {
    const attributes = profile.attributes;
    const categoryAttrs = Object.keys(attributes)
      .filter((attr) => typeof attributes[attr] === "number")
      .slice(0, 3);
    return { category, attributes: categoryAttrs.map((attr) => ({ name: attr, value: attributes[attr] })), };
  });

  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id="playerProfile"
      aria-label={`${profile.firstName} ${profile.lastName}`}
    >
      <h1 className="text-2xl font-bold">
        {profile.firstName} {profile.lastName}
      </h1>

      <div className="mt-2 text-sm text-text-secondary">
        <p>Age: {profile.age}</p>
        <p>Nationality: {profile.nationality}</p>
        {profile.birthplace && <p>Born: {profile.birthplace}</p>}
        <p>Club: {profile.club.name}</p>
        <p>Overall: {profile.overallRating}</p>
        <p>Contract: {profile.contractExpiry}</p>
        <p>Status: {INJURY_LABELS[profile.injuryStatus] ?? profile.injuryStatus}</p>
      </div>

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Positions</h2>
        <ul className="mt-1 list-inside">
          {profile.positions.map((pos) => (
            <li key={pos.position}>
              {pos.position} — {pos.familiarity}
            </li>
          ))}
        </ul>
      </section>

      {topAttributes.map(({ category, attributes }) => (
        <section key={category} className="mt-4">
          <h2 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h2>
          <ul className="mt-1 list-inside">
            {attributes.map((attr) => (
              <li key={attr.name}>
                {attr.name}: {attr.value}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
};