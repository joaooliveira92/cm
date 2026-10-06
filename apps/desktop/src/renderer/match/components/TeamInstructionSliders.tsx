import { dispatchAction } from "../../actions/dispatch.js";
import { Button } from "../../components/ui/button.js";
import { useMatchControlContext } from "../matchControlContext.js";
import { InstructionSlider } from "./InstructionSlider.js";
import type { Mentality } from "@cm-clone/contracts";

const MENTALITY_SCALE: ReadonlyArray<Mentality> = ["ultraDefensive", "defensive", "normal", "attacking", "gungHo"];

export const TeamInstructionSliders = () => {
  const { state } = useMatchControlContext();
  const tactic = state.tactic;
  if (!tactic) return null;
  return (
    <div>
      <p className="mb-1 text-data font-semibold text-text-soft">Team instructions</p>
      <div className="flex gap-6">
        <InstructionSlider<Mentality>
          label="Mentality"
          options={MENTALITY_SCALE}
          value={tactic.team.mentality}
          actionId="set-live-mentality"
          onChange={(mentality) => void dispatchAction("set-live-mentality", { value: mentality })}
        />
      </div>
      <p className="mt-1 text-data text-text-muted">
        The shape stays {tactic.sourceTemplate} while the match is live; only Mentality changes.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-2"
        data-action-id="apply-live-tactics"
        onClick={() => void dispatchAction("apply-live-tactics")}
      >
        Apply tactics change
      </Button>
    </div>
  );
};