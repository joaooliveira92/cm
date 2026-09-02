import { type SnapshotId } from "@cm-clone/contracts";
import { Effect } from "effect";
import { submitLeagueSelection } from "../src/main/leagueSelection.js";
import { DEFAULT_CAREER_INTENTS } from "../src/main/saves.js";

/**
 * The default snapshot ticket 03's test helpers construct: submit the default career scope
 * (England, top division — the single-league world generation has always produced) through the
 * real submission machinery and return the minted id. Direct `beginCareer` callers need a real
 * snapshot id because `beginCareer` loads the snapshot by id from `userDataDir`.
 */
export const createDefaultSnapshot = (userDataDir: string): Effect.Effect<SnapshotId> =>
  Effect.map(submitLeagueSelection(userDataDir, DEFAULT_CAREER_INTENTS), (snapshot) => snapshot.id);