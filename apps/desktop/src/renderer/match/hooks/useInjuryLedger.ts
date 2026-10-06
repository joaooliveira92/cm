import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CommentaryLineView, InjuryView, MatchId, RpcSuccess, SaveId } from "@cm-clone/contracts";
import {
  getActiveMatch,
  getRevealedFeed,
  recordRevealedInjuries,
  type LastRevealedInjury,
  type RevealedInjury,
} from "../session.js";

export interface InjuryLedger {
  /** The injuries the manager has been shown and has neither acted on nor had replaced, in reveal
   *  order. The live panel decides on these and on nothing else. */
  readonly revealed: ReadonlyArray<RevealedInjury>;
  /** A polled read carried these injuries; the Injury line that reveals one attaches it. */
  readonly note: (view: RpcSuccess<"resumeSimulation">) => void;
  /** `line` has been revealed: attach the injury it carried, or resolve the one a substitution at the
   *  same minute replaced. A line carrying no injury clears the pending one. */
  readonly attach: (line: CommentaryLineView) => void;
  /** What the manager was shown at the moment a command was sent — a command resolves exactly these. */
  readonly pending: () => ReadonlyArray<RevealedInjury>;
  /** A command acted on `actedOn`: they leave the ledger. */
  readonly resolve: (actedOn: ReadonlyArray<RevealedInjury>) => void;
  /** Play on: every pending decision goes. */
  readonly clear: () => void;
}

/**
 * Which injuries the manager has been shown and has yet to decide on.
 *
 * This is a ledger, not a projection: an injury joins it when the line announcing it is *revealed* — not
 * when it is fetched, because a line in the buffer has not been shown yet — and it leaves when a command
 * acts on it or a substitution replaces the player. Each entry carries the substitution cap as it stood
 * at that reveal, because the decision the manager was shown must not change after it was shown.
 */
export const useInjuryLedger = ({
  saveId,
  matchId,
  restored,
  restoredLast,
  capReached,
}: {
  readonly saveId: SaveId;
  readonly matchId: MatchId | undefined;
  readonly restored: ReadonlyArray<RevealedInjury>;
  readonly restoredLast: LastRevealedInjury | null;
  /** The substitution cap as of the last applied count, read at the moment an injury is revealed. */
  readonly capReached: () => boolean;
}): InjuryLedger => {
  const [revealed, setRevealed] = useState(restored);
  const revealedRef = useRef(restored);
  const lastRef = useRef(restoredLast);
  /** Which Injury line carries which injury, for the lifetime of that line object. */
  const injuryByLineRef = useRef(new WeakMap<CommentaryLineView, InjuryView>());

  // A reveal can land after this provider is gone; recording it then would persist a decision for a match
  // the manager has already left.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const update = useCallback(
    (change: (current: ReadonlyArray<RevealedInjury>) => ReadonlyArray<RevealedInjury>): void => {
      revealedRef.current = change(revealedRef.current);
      setRevealed(revealedRef.current);
      if (matchId === undefined) return;
      if (mountedRef.current) {
        recordRevealedInjuries(saveId, matchId, revealedRef.current, lastRef.current);
        return;
      }
      // Landed after unmount, on a match left paused on a decision. Re-derive against what the store
      // holds rather than against a list this provider can no longer vouch for.
      if (getActiveMatch(saveId)?.phase !== "paused") return;
      const recorded = getRevealedFeed(saveId, matchId);
      recordRevealedInjuries(saveId, matchId, change(recorded.revealedInjuries), recorded.lastRevealedInjury);
    },
    [saveId, matchId],
  );

  const note = useCallback((view: RpcSuccess<"resumeSimulation">): void => {
    const injuryLines = view.lines.filter((line) => line.tag === "Injury");
    for (const [index, line] of injuryLines.entries()) {
      const injury = view.injuries[index];
      if (injury !== undefined) injuryByLineRef.current.set(line, injury);
    }
  }, []);

  const attach = useCallback(
    (line: CommentaryLineView): void => {
      const previous = lastRef.current;
      if (line.tag === "Substitution" && previous !== null && previous.minute === line.minute && previous.revealed.injury.replaced) {
        update((current) => current.filter((entry) => entry !== previous.revealed));
      }
      const injury = injuryByLineRef.current.get(line);
      if (injury === undefined) {
        lastRef.current = null;
        if (matchId !== undefined) recordRevealedInjuries(saveId, matchId, revealedRef.current, null);
        return;
      }
      const entry: RevealedInjury = { injury, capReachedWhenRevealed: capReached() };
      lastRef.current = { revealed: entry, minute: line.minute };
      update((current) => [...current, entry]);
    },
    [saveId, matchId, capReached, update],
  );

  const pending = useCallback((): ReadonlyArray<RevealedInjury> => revealedRef.current, []);
  const resolve = useCallback(
    (actedOn: ReadonlyArray<RevealedInjury>): void => update((current) => current.filter((entry) => !actedOn.includes(entry))),
    [update],
  );
  const clear = useCallback((): void => update(() => []), [update]);

  // Stable identities: the feed composes its stream from these, and a fresh object per render would
  // re-mint that stream — and with it every effect that reads it — on every render.
  return useMemo(
    (): InjuryLedger => ({ revealed, note, attach, pending, resolve, clear }),
    [revealed, note, attach, pending, resolve, clear],
  );
};
