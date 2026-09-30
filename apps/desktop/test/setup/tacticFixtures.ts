/**
 * Complete Tactics for tests, built from the same template table the game loads them from. A test
 * names a template and the players; everything else is the template's own contents.
 */
import { PlayerId, Tactic } from "@cm-clone/contracts";
import { STARTER_COUNT, builtInTemplate, emptyBench, tacticFromTemplate } from "@cm-clone/shared";

export interface TacticOptions {
  /** A built-in template's name; 4-4-2 by default. */
  readonly template?: string;
  /** The bench, `BENCH_SIZE` places; empty by default. */
  readonly bench?: ReadonlyArray<string | null>;
}

/** A Tactic whose slots hold the first eleven of `playerIds`, in slot order. */
export const tacticOf = (playerIds: ReadonlyArray<string>, options: TacticOptions = {}): Tactic =>
  new Tactic(
    tacticFromTemplate(
      builtInTemplate(options.template ?? "4-4-2")!,
      playerIds.slice(0, STARTER_COUNT).map((id) => PlayerId.make(id)),
      (options.bench ?? emptyBench()).map((id) => (id === null ? null : PlayerId.make(id))),
    ),
  );

/** The same Tactic as `getTactics` puts on the wire: plain data, no class instances. */
export const wireTactic = (playerIds: ReadonlyArray<string>, options: TacticOptions = {}) =>
  JSON.parse(JSON.stringify(tacticOf(playerIds, options))) as unknown;
