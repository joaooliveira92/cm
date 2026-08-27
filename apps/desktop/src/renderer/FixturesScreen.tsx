import { useEffect, useState } from "react";
import type { FixturesView } from "@cm-clone/contracts";

export const FixturesScreen = ({ saveId }: { readonly saveId: string }) => {
  const [fixtures, setFixtures] = useState<FixturesView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.cmClone
      .call("getFixtures", { saveId })
      .then(setFixtures)
      .catch(() => setError("Failed to load fixtures"));
  }, [saveId]);

  if (error) return <p className="p-8 text-red-400">{error}</p>;
  if (!fixtures) return <p className="p-8 text-slate-400">Loading fixtures...</p>;

  const byMatchday = new Map<number, typeof fixtures.fixtures>();
  for (const fixture of fixtures.fixtures) {
    byMatchday.set(fixture.matchday, [...(byMatchday.get(fixture.matchday) ?? []), fixture]);
  }

  return (
    <main className="min-h-screen bg-slate-950 p-8 text-slate-100">
      <h1 className="text-2xl font-bold">Fixtures</h1>
      <p className="mt-1 text-sm text-slate-400">
        Season {fixtures.season.seasonNumber} &middot; {fixtures.fixtures.length} fixtures
      </p>

      <div className="mt-6 space-y-6">
        {[...byMatchday.entries()].map(([matchday, matchdayFixtures]) => (
          <section key={matchday}>
            <h2 className="text-sm font-semibold text-slate-400">Matchday {matchday}</h2>
            <ul className="mt-1 space-y-1 text-sm">
              {matchdayFixtures.map((fixture) => (
                <li key={fixture.id} className="flex justify-between border-b border-slate-800 py-1">
                  <span>
                    {fixture.homeClubName} vs {fixture.awayClubName}
                  </span>
                  <span className="text-slate-300">
                    {fixture.played ? `${fixture.homeGoals} - ${fixture.awayGoals}` : "-"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
};
