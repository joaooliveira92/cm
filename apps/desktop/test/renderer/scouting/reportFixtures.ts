import { ClubId, PlayerId, SaveId } from "@cm-clone/contracts";

/** Wire-shaped fixtures shared by the Team Scout Report screen tests. */

export const saveId = SaveId.make("s1");
export const me = ClubId.make("me");
export const target = ClubId.make("club-7");

export const reportFor = (clubId: string, clubName: string, overrides: Record<string, unknown> = {}) => ({
  reportId: `${clubId}:2024-08-01`,
  targetClubId: ClubId.make(clubId),
  targetClubName: clubName,
  scout: { scoutId: "scout-1", scoutName: "Sam Seeker" },
  observedAt: "2024-08-01",
  knowledgeConfidence: "moderate",
  freshness: "recent",
  predictedFormation: { formation: "4-3-3", confidence: "high" },
  recentForm: [
    { date: "2024-07-20", opponentClubName: "Harbour Town", isHome: true, goalsFor: 2, goalsAgainst: 1 },
  ],
  strengths: [{ area: "attack", note: "Quick through the middle", confidence: "high" }],
  weaknesses: [{ area: "defense", note: "Slow to turn at full-back", confidence: "low" }],
  keyPlayers: [
    {
      playerId: PlayerId.make("p-9"),
      firstName: "Nico",
      lastName: "Striker",
      position: "ST",
      progress: 40,
      abilityLow: 58,
      abilityHigh: 71,
    },
  ],
  setPieceFindings: [{ area: "setPieces", note: "Crowds the near post", confidence: "moderate" }],
  ...overrides,
});

export const profileView = (archived: boolean) => ({
  profile: {
    managerName: "Test Manager",
    archetypeOrigin: "custom",
    pillars: { tacticalAcumen: 3, influence: 3, regimen: 3, technicalCoaching: 3 },
  },
  clubName: "My Club",
  badgeKey: null,
  clubColours: {
    primary: { foreground: "#ffffff", background: "#123456" },
    secondary: { foreground: "#ffffff", background: "#654321" },
    tertiary: null,
    quaternary: null,
  },
  seasonNumber: 1,
  tenureSeasons: 1,
  archived,
});

export const fixturesView = (atBoundary: boolean) => ({
  season: {
    seasonNumber: 1,
    currentDate: "2024-08-01",
    phase: "in_season",
    awaitingFixture: atBoundary
      ? {
          fixtureId: 12,
          date: "2024-08-10",
          competitionId: "league_e1",
          opponentClubId: target,
          opponentClubName: "Northport Rovers",
          isHome: false,
          matchId: null,
          blockers: [],
        }
      : null,
  },
  fixtures: [
    // A later meeting listed first, so the earliest-date rule is what picks the answer.
    fixture(30, "2025-01-04", me, "My Club", target, "Northport Rovers"),
    fixture(12, "2024-08-10", target, "Northport Rovers", me, "My Club"),
    // Target against a third club: not the human club's fixture, never offered.
    fixture(5, "2024-08-03", target, "Northport Rovers", ClubId.make("x"), "Other FC"),
  ],
});

function fixture(id: number, date: string, homeId: string, home: string, awayId: string, away: string) {
  return {
    id,
    round: 1,
    date,
    homeClubId: ClubId.make(homeId),
    homeClubName: home,
    awayClubId: ClubId.make(awayId),
    awayClubName: away,
    homeGoals: null,
    awayGoals: null,
    played: false,
  };
}

export const squadView = { club: { id: me, name: "My Club", statureTier: "big" }, players: [] };

export const NOT_FOUND = { _tag: "Failure", error: { _tag: "SaveNotFoundError", id: saveId } };

