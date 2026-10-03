import { FOCUS_RING } from "../focus.js";
import { useMatchContext } from "./MatchProvider.js";
import { useCommentaryContext } from "./CommentaryProvider.js";
import { MatchControlContext } from "./matchControlContext.js";
import { controlledClubId } from "./controlledClub.js";
import { useMatchControl, type MatchControlInput } from "./useMatchControl.js";
import { PanelHeader } from "./components/PanelHeader.js";
import { TeamInstructionSliders } from "./components/TeamInstructionSliders.js";
import { SubstitutionControl } from "./components/SubstitutionControl.js";
import { InjuryDecisionModal } from "./components/InjuryDecisionModal.js";

export { InstructionSlider } from "./components/InstructionSlider.js";

const MatchControlProvider = (input: MatchControlInput) => {
  const value = useMatchControl(input);
  if (value === null) return null;
  const { state } = value;
  const { open, atHalftime, isHalftime, status, subsStatus } = state;

  return (
    <MatchControlContext.Provider value={value}>
      <section className="mt-4 rounded-panel border border-panel-border bg-panel-bg shadow-panel">
        <PanelHeader />
        {open && (
          <div className="space-y-4 border-t border-border-subtle p-4 text-body">
            <div>
              <p className="text-data text-text-secondary">
                Substitutions used: {subsStatus.used}/5 · Windows used: {subsStatus.windowsUsed}/3
                {subsStatus.capReached && <span className="ml-2 text-destructive">Cap reached</span>}
              </p>
            </div>

            <SubstitutionControl />
            <InjuryDecisionModal />

            <div>
              <label className="flex items-center gap-2 text-data text-text-secondary">
                <input
                  type="checkbox"
                  checked={isHalftime}
                  disabled={!atHalftime}
                  onChange={(event) => value.actions.setIsHalftime(event.target.checked)}
                  className={`accent-text-success ${FOCUS_RING.join(" ")}`}
                />
                Apply as a halftime instruction (doesn&apos;t consume a substitution window)
                {!atHalftime && " — available at half time"}
              </label>
            </div>

            <TeamInstructionSliders />

            {status && <p className="text-data text-text-muted">{status}</p>}
          </div>
        )}
      </section>
    </MatchControlContext.Provider>
  );
};

export const MatchControlPanel = () => {
  const { state } = useMatchContext();
  const { state: comm } = useCommentaryContext();
  const match = state.match;
  if (match === null) return null;
  return (
    <MatchControlProvider
      clubId={controlledClubId(match)}
      subsStatus={comm.clubSubs}
      subsKnown={comm.clubSubsKnown}
      onPitchCount={comm.clubOnPitchCount}
      pitch={comm.clubPitch}
      injuries={comm.revealedInjuries.map((revealed) => revealed.injury)}
    />
  );
};