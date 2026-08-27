import { useEffect, useRef, useState } from "react";
import type { ClubSummary, CommentaryLineView, MatchSummary } from "@cm-clone/contracts";

/** How often a new Commentary Line is revealed from the paced local queue (client-side pacing per
 * ADR-0007 — there is no RPC streaming transport, the renderer paces reveal of whatever chunk
 * `resumeSimulation` last returned). */
const REVEAL_INTERVAL_MS = 350;

/** How often we poll `resumeSimulation` for the next chunk, once the locally-buffered queue of
 * not-yet-revealed lines is running low. */
const POLL_INTERVAL_MS = 800;

/** Keep fetching ahead of the reveal pace once the buffer drops below this many lines. */
const REFETCH_THRESHOLD = 5;

export const MatchDayScreen = ({ saveId }: { readonly saveId: string }) => {
  const [opponents, setOpponents] = useState<ReadonlyArray<ClubSummary>>([]);
  const [opponentId, setOpponentId] = useState("");
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const [revealed, setRevealed] = useState<ReadonlyArray<CommentaryLineView>>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Mutable pacing/polling state that doesn't need to trigger re-renders on its own.
  const cursorRef = useRef(0);
  const pendingRef = useRef<Array<CommentaryLineView>>([]);
  const fetchingRef = useRef(false);
  const streamCompleteRef = useRef(false);

  useEffect(() => {
    window.cmClone
      .call("listOpponentClubs", { saveId })
      .then((clubs) => {
        setOpponents(clubs);
        if (clubs.length > 0) setOpponentId(clubs[0]!.id);
      })
      .catch(() => setError("Failed to load opponents"));
  }, [saveId]);

  const onStartMatch = async () => {
    if (!opponentId) return;
    setError(null);
    setStarting(true);
    setRevealed([]);
    setHomeScore(0);
    setAwayScore(0);
    setIsComplete(false);
    cursorRef.current = 0;
    pendingRef.current = [];
    streamCompleteRef.current = false;
    try {
      const summary = await window.cmClone.call("startMatch", { saveId, opponentClubId: opponentId });
      setMatch(summary);
    } catch {
      setError("Failed to start match");
    } finally {
      setStarting(false);
    }
  };

  // Drives successive ResumeSimulation calls (ticket 13) — no RPC streaming, just polling ahead of
  // the local reveal pace and buffering whatever comes back.
  useEffect(() => {
    if (!match) return;

    const poll = async () => {
      if (fetchingRef.current || streamCompleteRef.current) return;
      if (pendingRef.current.length > REFETCH_THRESHOLD) return;
      fetchingRef.current = true;
      try {
        const chunk = await window.cmClone.call("resumeSimulation", {
          saveId,
          matchId: match.matchId,
          cursor: cursorRef.current,
        });
        cursorRef.current = chunk.cursor;
        pendingRef.current.push(...chunk.lines);
        setHomeScore(chunk.homeScore);
        setAwayScore(chunk.awayScore);
        if (chunk.isComplete) streamCompleteRef.current = true;
      } catch {
        setError("Failed to resume match simulation");
        streamCompleteRef.current = true;
      } finally {
        fetchingRef.current = false;
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, saveId]);

  // Paces the feed: reveals one already-fetched Commentary Line at a time.
  useEffect(() => {
    if (!match) return;

    const interval = setInterval(() => {
      const next = pendingRef.current.shift();
      if (next) {
        setRevealed((lines) => [...lines, next]);
      } else if (streamCompleteRef.current) {
        setIsComplete(true);
      }
    }, REVEAL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match]);

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Match day</h1>
      {error && <p className="mt-2 text-red-400">{error}</p>}

      {!match && (
        <section className="mt-6 flex items-end gap-2">
          <div>
            <p className="text-sm text-slate-400">Opponent</p>
            <select
              className="mt-1 rounded bg-slate-800 px-2 py-1"
              value={opponentId}
              onChange={(event) => setOpponentId(event.target.value)}
            >
              {opponents.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!opponentId || starting}
            className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600 disabled:opacity-50"
            onClick={onStartMatch}
          >
            {starting ? "Starting..." : "Start match"}
          </button>
        </section>
      )}

      {match && (
        <section className="mt-6">
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-semibold">
              {match.homeClubName} {homeScore} - {awayScore} {match.awayClubName}
            </h2>
            <span className="text-sm text-slate-400">{isComplete ? "Full time" : "Live"}</span>
          </div>

          <ul className="mt-4 max-h-[60vh] space-y-1 overflow-y-auto rounded border border-slate-800 bg-slate-900 p-4 text-sm">
            {revealed.map((line, index) => (
              <li key={index} className="flex gap-3">
                <span className="w-10 shrink-0 text-slate-500">{line.minute}&apos;</span>
                <span>{line.text}</span>
              </li>
            ))}
            {revealed.length === 0 && <li className="text-slate-500">Kick-off is coming up...</li>}
          </ul>

          {isComplete && (
            <div className="mt-4 flex items-center gap-3">
              <p className="font-semibold">
                Final score: {match.homeClubName} {homeScore} - {awayScore} {match.awayClubName}
              </p>
              <button
                type="button"
                className="rounded bg-slate-700 px-3 py-1 hover:bg-slate-600"
                onClick={() => setMatch(null)}
              >
                Back to opponent picker
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};
