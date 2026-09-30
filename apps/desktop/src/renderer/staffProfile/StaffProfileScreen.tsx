/**
 * Staff Profile: one person in any club's backroom, laid out as CM 03/04 drew a staff member — the
 * name and club over the role / nationality / age line, then Coaching, Mental and Tactics panels
 * side by side, the coach's rankings of the squad, and Overview and History across the foot.
 *
 * Every rating, preference and biography line is derived presence (Agent Note 2026-09-28): no
 * formula reads them. The one number a formula reads — a Coach's or Scout's quality — is the
 * rating it is pinned to (Coaching Outfield Players, Judging Player Ability), so what the manager
 * sees never disagrees with the development or scouting they get.
 *
 * Panels a role has no content for are absent rather than empty: the President coaches nobody, and
 * only the Coach and the Assistant Manager hold tactical views or rank the squad. Rankings appear
 * only for the manager's own club, because a rival's squad is read through Scouting Progress.
 */
import type {
  ClubId,
  SaveId,
  StaffProfileView,
  StaffRankingsView,
} from "@cm-clone/contracts";
import {
  POSITIONS,
  STAFF_COACHING_RATINGS,
  STAFF_MENTAL_RATINGS,
  formatCalendarDate,
  type ClubPersonRole,
  type Position,
  type StaffCoachingRating,
  type StaffMentalRating,
} from "@cm-clone/shared";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { FOCUS_RING } from "../focus.js";
import { intentOfClick, navigateCareer } from "../navigation/adapter.js";
import { PlayerNotePanel, PlayerPanel, PlayerRow } from "../player/panels.js";
import { POSITION_NAMES } from "../positionNames.js";
import { describeRpcError, staffProfileAtom, typedError, useAtomValue } from "../rpc.js";

const PAGE_CLASS = `flex flex-1 flex-col gap-3 px-4 pt-3 pb-6 text-foreground ${FOCUS_RING.join(" ")}`;

export const STAFF_ROLE_TITLES: Readonly<Record<ClubPersonRole, string>> = {
  president: "President",
  coach: "Coach",
  assistant: "Assistant Manager",
  scout: "Scout",
  physio: "Physio",
};

const COACHING_LABELS: Readonly<Record<StaffCoachingRating, string>> = {
  coachingGoalkeepers: "Coaching Goalkeepers",
  coachingOutfieldPlayers: "Coaching Outfield Players",
  manManagement: "Man Management",
  physiotherapy: "Physiotherapy",
  tacticalKnowledge: "Tactical Knowledge",
  workingWithYoungsters: "Working With Youngsters",
};

const MENTAL_LABELS: Readonly<Record<StaffMentalRating, string>> = {
  adaptability: "Adaptability",
  determination: "Determination",
  judgingPlayerAbility: "Judging Player Ability",
  judgingPlayerPotential: "Judging Player Potential",
  levelOfDiscipline: "Level of Discipline",
  motivating: "Motivating",
};

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

export const StaffProfileScreen = ({
  saveId,
  clubId,
  staffKey,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
  readonly staffKey: string;
}) => {
  const result = useAtomValue(staffProfileAtom(saveId, clubId, staffKey));
  const profile = result._tag === "Success" ? result.value : null;
  const error = typedError(result);
  const message =
    result._tag === "Initial"
      ? "Loading staff profile..."
      : error === null
        ? "Staff profile could not be loaded."
        : describeRpcError(error);
  const name = profile === null ? "Staff Profile" : `${profile.firstName} ${profile.lastName}`;

  // One <main> for every state, as on the player screens, so focus placed on arrival survives the
  // read resolving.
  return (
    <main
      className={PAGE_CLASS}
      tabIndex={-1}
      data-focus-id="staffProfile"
      aria-labelledby="staff-profile-heading"
      aria-busy={result._tag === "Initial" ? true : undefined}
    >
      {profile === null ? (
        <>
          <h1 id="staff-profile-heading" className="text-title">
            {name}
          </h1>
          <p className="text-text-secondary">{message}</p>
        </>
      ) : (
        <StaffProfileBody saveId={saveId} profile={profile} />
      )}
    </main>
  );
};

const StaffProfileBody = ({
  saveId,
  profile,
}: {
  readonly saveId: SaveId;
  readonly profile: StaffProfileView;
}) => (
  <>
    <header className="rounded-panel bg-panel-bg px-3 py-2 text-center">
      <h1 id="staff-profile-heading" className="text-title">
        {profile.firstName} {profile.lastName} ({profile.club.name})
        {!profile.isUserClub && (
          <span className="ml-2 text-body font-semibold text-text-secondary">[Not your club]</span>
        )}
      </h1>
      <p className="text-body font-semibold text-text-secondary">
        {STAFF_ROLE_TITLES[profile.role]}, {profile.nationality}, Age {profile.age}
      </p>
    </header>

    {(profile.coaching !== null || profile.mental !== null || profile.tactics !== null) && (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {profile.coaching !== null && (
          <PlayerPanel title="Coaching">
            {STAFF_COACHING_RATINGS.map((key) => (
              <PlayerRow key={key} label={COACHING_LABELS[key]} value={profile.coaching?.[key]} />
            ))}
          </PlayerPanel>
        )}
        {profile.mental !== null && (
          <PlayerPanel title="Mental">
            {STAFF_MENTAL_RATINGS.map((key) => (
              <PlayerRow key={key} label={MENTAL_LABELS[key]} value={profile.mental?.[key]} />
            ))}
          </PlayerPanel>
        )}
        {profile.tactics !== null && (
          <PlayerPanel title="Tactics">
            <PlayerRow label="Preferred Formation" value={profile.tactics.formation} />
            <PlayerRow label="Mentality" value={capitalise(profile.tactics.mentality)} />
            <PlayerRow label="Tempo" value={capitalise(profile.tactics.tempo)} />
            <PlayerRow label="Pressing" value={capitalise(profile.tactics.pressing)} />
            <PlayerRow label="Coaching Emphasis" value={capitalise(profile.tactics.coachingEmphasis)} />
          </PlayerPanel>
        )}
      </div>
    )}

    {profile.rankings !== null && <RankingsPanel saveId={saveId} rankings={profile.rankings} />}

    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <PlayerPanel title="Overview">
        <PlayerRow label="Date of Birth" value={formatCalendarDate(profile.dateOfBirth)} />
        <PlayerRow label="Nationality" value={profile.nationality} />
        <PlayerRow label="Languages" value={profile.languages.join(", ")} />
        <PlayerRow label="Joined Club" value={formatCalendarDate(profile.joined)} />
        {profile.plansTraining && <PlayerRow label="Duties" value="Plans the Training Schedule" />}
      </PlayerPanel>
      <PlayerNotePanel title="History">
        {profile.history.length === 0 ? (
          <p className="text-body text-text-secondary">
            No earlier clubs — {profile.club.name} is their first post.
          </p>
        ) : (
          <Table aria-label="Earlier clubs">
            <TableHeader>
              <TableRow>
                <TableHead>Seasons</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profile.history.map((spell) => (
                <TableRow key={`${spell.fromYear}-${spell.club.id}`}>
                  <TableCell className="tabular-nums">
                    {spell.fromYear}–{spell.toYear}
                  </TableCell>
                  <TableCell>{spell.club.name}</TableCell>
                  <TableCell>{STAFF_ROLE_TITLES[spell.role]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PlayerNotePanel>
    </div>
  </>
);

const POSITION_BUTTON_CLASS = `rounded-control px-2 py-1 text-label transition-colors ${FOCUS_RING.join(" ")}`;

/**
 * The squad, best first, at one Position, as this person judges it. Defaults to Striker, as CM
 * did; the Position buttons swap the list without another read, because every Position's order
 * arrived with the profile.
 */
const RankingsPanel = ({
  saveId,
  rankings,
}: {
  readonly saveId: SaveId;
  readonly rankings: StaffRankingsView;
}) => {
  const [position, setPosition] = useState<Position>("ST");
  const players = new Map(rankings.players.map((player) => [player.id, player]));
  const order = rankings.byPosition.find((entry) => entry.position === position)?.playerIds ?? [];
  const title = `Coach Player Rankings (${POSITION_NAMES[position]})`;

  return (
    <PlayerNotePanel title={title}>
      <div role="group" aria-label="Ranking position" className="mb-2 flex flex-wrap gap-1">
        {POSITIONS.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={candidate === position}
            aria-label={POSITION_NAMES[candidate]}
            className={`${POSITION_BUTTON_CLASS} ${
              candidate === position
                ? "bg-surface-raised text-text-highlight"
                : "text-text-secondary hover:bg-surface hover:text-text-primary"
            }`}
            onClick={() => setPosition(candidate)}
          >
            {candidate}
          </button>
        ))}
      </div>
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Rnk</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Position(s)</TableHead>
            <TableHead className="text-right">Age</TableHead>
            <TableHead className="text-right">Cond.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.map((playerId, index) => {
            const player = players.get(playerId);
            if (player === undefined) return null;
            return (
              <TableRow key={playerId}>
                <TableCell className="tabular-nums">{index + 1}</TableCell>
                <TableCell>
                  <button
                    type="button"
                    className={`font-semibold hover:underline ${FOCUS_RING.join(" ")}`}
                    onClick={(event) =>
                      navigateCareer({ type: "playerDetail", saveId, playerId }, intentOfClick(event))
                    }
                  >
                    {player.lastName}, {player.firstName.charAt(0)}
                  </button>
                </TableCell>
                <TableCell>{player.positionLabel}</TableCell>
                <TableCell className="text-right tabular-nums">{player.age}</TableCell>
                <TableCell className="text-right tabular-nums">{player.condition}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </PlayerNotePanel>
  );
};
