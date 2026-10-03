import type { ClubSelectionTopPlayer } from "@cm-clone/contracts";
import { DetailCard } from "./DetailCard.js";
import { TopPlayerRow } from "./TopPlayerRow.js";

export interface TopPlayersCardProps {
  readonly players: ReadonlyArray<ClubSelectionTopPlayer>;
}

export const TopPlayersCard = ({ players }: TopPlayersCardProps) => (
  <DetailCard title="Top Players" className="mb-3 flex-1 min-h-0" contentClassName="pb-2 pt-0">
    <ul className="space-y-1">
      {players.map((player) => (
        <TopPlayerRow key={player.name} player={player} />
      ))}
    </ul>
  </DetailCard>
);
