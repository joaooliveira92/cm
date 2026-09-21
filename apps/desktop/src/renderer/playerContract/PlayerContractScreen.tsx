/**
 * Player Information (Screen 56) — the second player tab.
 *
 * CM 03/04's Information tab stacked three panels: Overview (the biographical facts), Happiness,
 * and Contract Details. Happiness has no counterpart here — no morale system is modelled (Group D
 * ticket 03) — so this screen is Overview over the profile read and Contract Details over the
 * contract read.
 *
 * The two reads are deliberately separate atoms rather than one merged view: the profile is the
 * header every player tab already needs, and the contract is the only thing this tab adds. A
 * player whose contract cannot be read still gets their Overview.
 */
import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { formatCredits } from "../format.js";
import { PlayerPanel, PlayerRow } from "../player/panels.js";
import { PlayerScreenFrame } from "../player/PlayerScreenFrame.js";
import { describeRpcError, playerContractAtom, squadAtom, typedError, useAtomValue } from "../rpc.js";
import { RenewContractPanel } from "./RenewContractPanel.js";

/** The Contract Details panel, with its own three view states so a failed contract read costs the
 *  panel and not the page. When the squad read names the manager's club as the contract's club, the
 *  renew action (Screen 140) sits below the rows, in the same grid cell so the page it acts on and
 *  the action stay together. */
const ContractPanel = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => {
  const contractResult = useAtomValue(playerContractAtom(saveId, playerId));
  const squadResult = useAtomValue(squadAtom(saveId));

  if (contractResult._tag === "Initial") {
    return (
      <PlayerPanel title="Contract Details">
        <PlayerRow label="Contract" value="Loading..." />
      </PlayerPanel>
    );
  }

  if (contractResult._tag === "Failure") {
    const error = typedError(contractResult);
    return (
      <PlayerPanel title="Contract Details">
        <PlayerRow
          label="Contract"
          value={error === null ? "Could not be loaded." : describeRpcError(error)}
        />
      </PlayerPanel>
    );
  }

  const contract = contractResult.value;
  const years = contract.lengthYears;
  // Renewal is for the manager's own club only; until the squad read names that club, no action shows.
  const ownClub = squadResult._tag === "Success" && squadResult.value.club.id === contract.clubId;

  return (
    <>
      <PlayerPanel title="Contract Details">
        <PlayerRow label="Wages" value={`${formatCredits(contract.wage)} per season`} />
        <PlayerRow label="Length" value={`${years} year${years === 1 ? "" : "s"}`} />
        <PlayerRow label="Started" value={contract.startDate} />
        <PlayerRow label="Expires" value={contract.expiryDate} />
      </PlayerPanel>
      {ownClub && <RenewContractPanel saveId={saveId} playerId={playerId} />}
    </>
  );
};

export const PlayerContractScreen = ({
  saveId,
  playerId,
}: {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
}) => (
  <PlayerScreenFrame saveId={saveId} playerId={playerId} tab="playerContract">
    {(profile) => (
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <PlayerPanel title="Overview">
          <PlayerRow label="Age" value={profile.age} />
          <PlayerRow label="Place Of Birth" value={profile.birthplace ?? "Unknown"} />
          <PlayerRow label="Nationality" value={profile.nationality} />
          <PlayerRow label="Club" value={profile.club.name} />
          <PlayerRow label="Value" value={formatCredits(profile.transferValue)} />
          <PlayerRow label="Overall Rating" value={profile.overallRating} />
        </PlayerPanel>
        <ContractPanel saveId={saveId} playerId={playerId} />
      </div>
    )}
  </PlayerScreenFrame>
);
