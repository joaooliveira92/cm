import type { CreationSession } from "../router/createSessionContext.js";
import { selectedClubOf } from "./clubSelection.js";

/** Step 4 — the read-only summary of everything the flow has collected. */
export const ReviewPane = ({
  session,
}: {
  readonly session: CreationSession;
}) => {
  const leagueScope =
    session.leagueSelection === null
      ? "Not selected"
      : `${session.leagueSelection.estimate.playableNationCount} playable nation${session.leagueSelection.estimate.playableNationCount === 1 ? "" : "s"
      }, ${session.leagueSelection.estimate.playableCompetitionCount
      } playable competition${session.leagueSelection.estimate.playableCompetitionCount === 1
        ? ""
        : "s"
      }`;

  return (
    <div className="text-text-body">
      <h2 className="text-lg font-semibold">Review Career</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-4">
          <dt className="text-text-muted">Save name:</dt>
          <dd>{session.saveName}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Manager name:</dt>
          <dd>{session.managerName || session.saveName}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Archetype:</dt>
          <dd className="capitalize">
            {session.archetype.replaceAll("_", " ")}
          </dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Club:</dt>
          <dd>{selectedClubOf(session)?.clubName ?? "Not selected"}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">League scope:</dt>
          <dd>{leagueScope}</dd>
        </div>

        <div className="flex gap-4">
          <dt className="text-text-muted">Pillars:</dt>
          <dd>
            {session.pillars.tacticalAcumen}/{session.pillars.influence}/
            {session.pillars.regimen}/{session.pillars.technicalCoaching}
          </dd>
        </div>
      </dl>
    </div>
  );
};
