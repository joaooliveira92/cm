import type { ClubSelectionRow } from "@cm-clone/contracts";
import { BoardObjectiveCard } from "./BoardObjectiveCard.js";
import { ClubHero } from "./ClubHero.js";
import { FinancesCard } from "./FinancesCard.js";
import { SquadQualityCard } from "./SquadQualityCard.js";
import { TopPlayersCard } from "./TopPlayersCard.js";

export interface ClubProfileProps {
  readonly club: ClubSelectionRow;
  readonly leagueSize: number;
}

/** The panel after a pick: the club's profile, built entirely from the row the rail already holds. */
export const ClubProfile = ({ club, leagueSize }: ClubProfileProps) => (
  <>
    <ClubHero club={club} />
    <BoardObjectiveCard club={club} leagueSize={leagueSize} />
    <SquadQualityCard band={club.squadQualityBand} accentColour={club.clubColours.primary.background} />
    <FinancesCard transferBudget={club.transferBudget} wageBudget={club.wageBudget} />



    <TopPlayersCard players={club.detail.topPlayers} />

    {/* Squad summary footer */}
    <div className="flex items-center justify-between text-data text-text-muted px-1 py-1">
      <span>Squad of {club.detail.squadSize}</span>
      <span>Avg age {club.detail.averageAge}</span>
      <span>{club.detail.topPlayers.length} rated</span>
    </div>
  </>
);
