import { useAtomValue, fixturesAtom, leagueTableAtom } from "../rpc.js";
import { FOCUS_RING } from "../focus.js";
import type { SaveId, FixtureView } from "@cm-clone/contracts";

const formIcon = (fixture: FixtureView, clubId: string): string => {
  if (!fixture.played || fixture.homeGoals === null || fixture.awayGoals === null) return "-";
  const homeWin = fixture.homeGoals > fixture.awayGoals;
  return fixture.homeClubId === clubId ? (homeWin ? "W" : "L") : (homeWin ? "L" : "W");
};

const formClass = (result: string): string => {
  if (result === "W") return "text-green-600 font-bold";
  if (result === "L") return "text-red-600 font-bold";
  return "text-text-secondary";
};

export const MatchPreviewScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const tableResult = useAtomValue(leagueTableAtom(saveId));
  const fixturesResult = useAtomValue(fixturesAtom(saveId));
  const tableSuccess = tableResult._tag === "Success" ? tableResult : null;
  const fixturesSuccess = fixturesResult._tag === "Success" ? fixturesResult : null;
  const pending = tableSuccess?.value.season.awaitingFixture ?? null;

  if (pending === null) {
    return (
      <main tabIndex={-1} data-focus-id="matchPreview" aria-label="Match Preview"
        className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
        <h1 className="text-2xl font-bold">Match Preview</h1>
        <p className="mt-4 text-text-secondary italic">No upcoming fixture</p>
      </main>
    );
  }

  const humanClubId = String(pending.isHome ? pending.fixtureId : pending.opponentClubId);
  const oppClubId = String(pending.opponentClubId);
  const homeClub = pending.isHome ? "Your Club" : pending.opponentClubName;
  const awayClub = pending.isHome ? pending.opponentClubName : "Your Club";

  const allFixtures = fixturesSuccess?.value.fixtures ?? [];

  const recentForm = (clubId: string) => {
    const played = allFixtures
      .filter((f) => f.played && (f.homeClubId === clubId || f.awayClubId === clubId) && f.date < pending.date)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    return played.map((f) => formIcon(f, clubId));
  };

  const headToHead = () => {
    const matches = allFixtures
      .filter((f) => f.played && (
        (f.homeClubId === oppClubId && f.awayClubId === humanClubId) ||
        (f.homeClubId === humanClubId && f.awayClubId === oppClubId)
      ))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    return matches;
  };

  return (
    <main tabIndex={-1} data-focus-id="matchPreview" aria-label="Match Preview"
      className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold mb-6">Match Preview</h1>

      <section className="rounded-panel border border-panel-border-dark bg-panel-bg p-6 shadow-panel mb-6">
        <div className="text-center mb-4">
          <p className="text-sm text-text-tertiary uppercase tracking-wide">{pending.competitionId}</p>
          <p className="text-lg font-semibold mt-2">{homeClub} vs {awayClub}</p>
          <p className="text-sm text-text-secondary mt-1">{pending.date}</p>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-panel border border-panel-border-dark bg-panel-bg p-4 shadow-panel">
          <h2 className="text-lg font-bold mb-2">Recent Form</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold text-text-secondary mb-1">{homeClub}</p>
              <div className="flex gap-1.5">
                {recentForm(humanClubId).map((r, i) => (
                  <span key={i} className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs ${formClass(r)}`}>{r}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-secondary mb-1">{awayClub}</p>
              <div className="flex gap-1.5">
                {recentForm(pending.opponentClubId).map((r, i) => (
                  <span key={i} className={`inline-flex h-6 w-6 items-center justify-center rounded text-xs ${formClass(r)}`}>{r}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-panel border border-panel-border-dark bg-panel-bg p-4 shadow-panel">
          <h2 className="text-lg font-bold mb-2">Head to Head</h2>
          {headToHead().length === 0 ? (
            <p className="text-sm text-text-secondary italic">No previous meetings this season</p>
          ) : (
            <div className="space-y-1.5">
              {headToHead().map((f) => (
                <p key={f.id} className="text-sm">
                  {f.homeClubName} {f.homeGoals} - {f.awayGoals} {f.awayClubName}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};