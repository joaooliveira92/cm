/**
 * Player Profile (Screen 50) — the tab a player's name opens on.
 *
 * CM 03/04 drew it as three side-by-side Attribute columns (Technical, Mental, Physical) with the
 * derived, non-1-to-20 readings tinted at the foot of the last one, then the Selection Details
 * strip beneath. This is that layout over the data this game actually models: every Attribute in
 * its Category, Overall Rating and Transfer Value as the derived pair, and Positions with their
 * Familiarity Tier in place of CM's per-position grid.
 *
 * Below Fully Scouted the profile reads by the manager's Scouting Progress on the player (Agent
 * Note 2026-09-19, ticket 10): every Attribute, Overall Rating and Transfer Value renders as the
 * `low–high` Attribute Range the market publishes, exact only at Fully Scouted.
 *
 * Read-only. Every command that acts on a player lives on the surface that owns it (Training Focus
 * on Development, bids on Transfers); this screen only reports.
 */
import { type PlayerId, type PlayerProfileView, type SaveId } from "@cm-clone/contracts";
import {
  CATEGORY_ATTRIBUTES,
  type Attribute,
  type Category,
  type FamiliarityTier,
} from "@cm-clone/shared";
import { formatFigure, formatFigureCredits } from "../format.js";
import { attributeLabel } from "../playerCoachReport/developmentProgress.js";
import { injuryLabel } from "../player/injury.js";
import { PlayerPanel, PlayerRow } from "../player/panels.js";
import { PlayerScreenFrame } from "../player/PlayerScreenFrame.js";

const CATEGORY_LABELS: Record<Category, string> = {
  goalkeeping: "Goalkeeping",
  mental: "Mental",
  physical: "Physical",
  technical: "Technical",
};

/** The tone a Familiarity Tier reads in, matching the Squad screen's position list so a Natural
 *  position looks the same wherever it is drawn. */
const FAMILIARITY_TONE: Readonly<Record<FamiliarityTier, string>> = {
  natural: "text-text-highlight",
  competent: "text-text-body",
  unfamiliar: "text-text-muted",
};

const tierLabel = (tier: string): string => tier.charAt(0).toUpperCase() + tier.slice(1);

/**
 * One Category's column. Goalkeeping Attributes are absent — not zero — for an outfield player
 * (CONTEXT.md), so a Category whose Attributes the profile does not carry draws no panel at all
 * rather than a column of blanks.
 */
const AttributeColumn = ({
  category,
  attributes,
  children,
}: {
  readonly category: Category;
  readonly attributes: PlayerProfileView["attributes"];
  readonly children?: React.ReactNode;
}) => {
  const present = CATEGORY_ATTRIBUTES[category].filter(
    (attribute) => attributes[attribute] !== undefined,
  );
  if (present.length === 0) return null;
  return (
    <PlayerPanel title={CATEGORY_LABELS[category]}>
      {present.map((attribute: Attribute) => {
        const figure = attributes[attribute];
        return figure === undefined ? null : (
          <PlayerRow key={attribute} label={attributeLabel(attribute)} value={formatFigure(figure)} />
        );
      })}
      {children}
    </PlayerPanel>
  );
};

/** The positions strip: every Position the player can fill, toned by Familiarity Tier, with the
 *  tier spelled out in text beside it — never colour alone. */
const PositionsPanel = ({ profile }: { readonly profile: PlayerProfileView }) => (
  <PlayerPanel title="Positions">
    {profile.positions.length === 0 ? (
      <PlayerRow label="Positions" value="None recorded" />
    ) : (
      profile.positions.map((entry) => (
        <div
          key={entry.position}
          className="flex items-baseline justify-between gap-4 py-0.5 text-sm"
        >
          <dt className={FAMILIARITY_TONE[entry.familiarity]}>{entry.position}</dt>
          <dd className="font-semibold text-text-highlight">{tierLabel(entry.familiarity)}</dd>
        </div>
      ))
    )}
  </PlayerPanel>
);

export const PlayerProfileScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => (
  <PlayerScreenFrame saveId={saveId} playerId={playerId} tab="playerProfile">
    {(profile) => (
      <>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <AttributeColumn category="technical" attributes={profile.attributes} />
          <AttributeColumn category="mental" attributes={profile.attributes} />
          <AttributeColumn category="physical" attributes={profile.attributes}>
            {/* CM's tinted tail: the readings that are not 1-20 Attributes, kept in the last
                column so the three Attribute lists stay the same kind of thing throughout. */}
            <PlayerRow label="Overall Rating" value={formatFigure(profile.overallRating)} emphasis />
            <PlayerRow label="Transfer Value" value={formatFigureCredits(profile.transferValue)} emphasis />
          </AttributeColumn>
          <AttributeColumn category="goalkeeping" attributes={profile.attributes} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <PositionsPanel profile={profile} />
          <PlayerPanel title="Selection Details">
            <PlayerRow
              label="Injuries"
              value={injuryLabel(profile.injuryStatus)}
            />
            <PlayerRow label="Contract Expires" value={profile.contractExpiry} />
          </PlayerPanel>
        </div>
      </>
    )}
  </PlayerScreenFrame>
);
