/** Fixtures for mounting `SquadScreen`. The screen makes two reads, not one: `getSquad` for the
 *  table and `getTactics` for the lineup bar, which renders its own `role=alert` when its read
 *  fails. A test that answers only `getSquad` therefore mounts a screen with a standing error on
 *  it — invisible to most assertions, and misleading to any that look for an alert. */
import {
  FAMILIARITY_TIERS,
  FORMATION_SLOTS,
  GOALKEEPING_ATTRIBUTES,
  HIDDEN_ATTRIBUTES,
  OUTFIELD_ATTRIBUTES,
  POSITION_ROLES,
  STATURE_TIERS,
} from "@cm-clone/shared";

/** Every attribute at one value — enough for a row to render; never what a test asserts on. */
export const attributes = (value: number): Record<string, number> => ({
  ...Object.fromEntries(OUTFIELD_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(GOALKEEPING_ATTRIBUTES.map((a) => [a, value])),
  ...Object.fromEntries(HIDDEN_ATTRIBUTES.map((a) => [a, value])),
});

/** One squad row, named `<name> Player` so a test can find it by regex. */
export const squadPlayer = (id: string, name: string, position: string) => ({
  id,
  firstName: name,
  lastName: "Player",
  dateOfBirth: "1990-01-01",
  age: 25,
  attributes: attributes(12),
  positions: [{ position, familiarity: FAMILIARITY_TIERS[0] }],
  overallRating: 80,
  positionRatings: { ST: 12 },
  condition: 100,
  trainingFocus: null,
  nationality: "England",
  birthplace: "London",
});

/** A `getSquad` success payload. */
export const squadView = (clubId: string, clubName: string, players: ReadonlyArray<unknown>) => ({
  club: { id: clubId, name: clubName, statureTier: STATURE_TIERS[0] },
  players,
});

/** A 4-4-2 with no player assigned to any slot or bench place. */
export const emptyTactic = () => ({
  formation: "4-4-2" as const,
  slots: FORMATION_SLOTS["4-4-2"].map((position) => ({
    position,
    role: POSITION_ROLES[position],
    playerId: "",
  })),
  bench: [null, null, null, null, null, null, null],
  mentality: "balanced" as const,
  tempo: "normal" as const,
  pressing: "medium" as const,
});

/** A `getTactics` success payload for the given club and squad. */
export const tacticsView = (
  clubId: string,
  clubName: string,
  players: ReadonlyArray<unknown>,
  tactic: unknown = emptyTactic(),
) => ({
  club: { id: clubId, name: clubName, statureTier: STATURE_TIERS[0] },
  squad: players,
  tactic,
  revision: 0,
});
