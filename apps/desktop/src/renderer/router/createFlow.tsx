/**
 * Route adapters for the creation flow. Each one binds a step screen to the
 * parent-owned session; the shell itself is `create/CreateFlowLayout.tsx` and
 * the session logic is `create/useCreateSession.ts`.
 */
import { useCallback } from "react";
import { type LeagueSelectionSnapshot } from "@cm-clone/contracts";
import { ClubSelectionScreen } from "../clubSelection/ClubSelectionScreen.js";
import { ManagerIdentityStep } from "../create/ManagerIdentityStep.js";
import { ActiveLeaguesScreen } from "../activeLeagues/ActiveLeaguesScreen.js";
import { navigate } from "../navigation/adapter.js";
import { GenerationStatus } from "../create/GenerationStatus.js";
import { ReviewPane } from "../create/ReviewPane.js";
import { provisionalIdOf } from "../create/generation.js";
import { selectedClubOf } from "../create/clubSelection.js";
import { RouteView } from "./RouteView.js";
import { useCreateSessionApi } from "./createSessionContext.js";

/**
 * Step 1. The Active Leagues setup screen replaced the League & Nation tree as the primary
 * surface here; the tree is retained and reachable from inside it through Manage leagues. The
 * step's contract with the rest of the flow is unchanged: Continue records the same
 * `LeagueSelectionSnapshot` and lands the player on Step 2 · Manager.
 */
export const LeagueSelectionRouteContent = () => {
  const { update, requestLeave } = useCreateSessionApi();

  const handleContinue = useCallback(
    (snapshot: LeagueSelectionSnapshot): void => {
      update({ leagueSelection: snapshot });
      navigate({ type: "createStep1" });
    },
    [update],
  );

  return (
    <RouteView screenId="createLeagues" fill>
      {/* Leaving from here is not always cheap: a player who stepped back from
          the Manager step is standing in front of a world that already exists,
          so this Cancel goes through the same gate the shell's does. */}
      <ActiveLeaguesScreen onContinue={handleContinue} onCancel={requestLeave} />
    </RouteView>
  );
};

export const StepOneRouteContent = () => {
  return (
    <RouteView screenId="createStep1">
      <ManagerIdentityStep />
    </RouteView>
  );
};

export const StepTwoRouteContent = () => {
  const { session, retryGeneration, selectClub } = useCreateSessionApi();
  const provisionalId = provisionalIdOf(session.generation);
  const selectedClub = selectedClubOf(session);

  return (
    <RouteView screenId="createStep2" fill>
      {provisionalId === null ? (
        <GenerationStatus
          state={session.generation}
          onRetry={retryGeneration}
        />
      ) : (
        <ClubSelectionScreen
          saveId={provisionalId}
          selectedClubId={selectedClub?.clubId ?? null}
          onSelect={selectClub}
        />
      )}
    </RouteView>
  );
};

export const StepThreeRouteContent = () => {
  const { session } = useCreateSessionApi();

  return (
    <RouteView screenId="createStep3">
      <ReviewPane session={session} />
    </RouteView>
  );
};
