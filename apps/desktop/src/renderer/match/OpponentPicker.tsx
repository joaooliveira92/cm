import { ClubId } from "@cm-clone/contracts";
import { Button } from "../components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { dispatchAction } from "../actions/dispatch.js";
import { useMatchContext } from "./MatchProvider.js";
import { SELECT_CLASS } from "./controls.js";

/** The pre-match opponent picker (Phase 1: reads the provider's opponent state instead of owning
 *  it). Consumes `state.opponents`/`state.opponentId`/`state.starting` and `actions.chooseOpponent`
 *  from context; the start command goes through the registered `start-match` Action (ADR-0012). */
export const OpponentPicker = () => {
  const { state, actions } = useMatchContext();
  return (
    <section className="mt-6 flex items-end gap-2">
      <div>
        <p className="text-sm text-text-secondary">Opponent</p>
        <Select
          value={state.opponentId}
          onValueChange={(value) => {
            if (value !== null) actions.chooseOpponent(ClubId.make(value));
          }}
        >
          <SelectTrigger aria-label="Opponent" className={`mt-1 ${SELECT_CLASS}`}>
            <SelectValue placeholder="Choose an opponent" />
          </SelectTrigger>
          <SelectContent>
            {state.opponents.map((club) => (
              <SelectItem key={club.id} value={club.id}>
                {club.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        data-action-id="start-match"
        disabled={!state.opponentId || state.starting}
        onClick={() => void dispatchAction("start-match")}
      >
        {state.starting ? "Starting..." : "Start match"}
      </Button>
    </section>
  );
};