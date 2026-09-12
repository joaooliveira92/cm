import { useEffect, useState } from "react";
import type { CareerSetupSummaryView } from "@cm-clone/contracts";
import { formatCalendarDate } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { getCareerSetupSummary } from "../rpc.js";
import type { CreationSession } from "../router/createSessionContext.js";
import { selectedClubOf } from "./clubSelection.js";
import { describeCompetitions, describeStaff } from "./careerSetupSummary.js";
import { provisionalIdOf } from "./generation.js";

/**
 * What the Review step knows about the generated world. The summary is a read of a world that
 * already exists, so there is nothing to retry into and no failure that should reach the commit —
 * `Unavailable` is a rendered line, not a blocked career.
 */
type SummaryState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Ready"; readonly view: CareerSetupSummaryView }
  | { readonly _tag: "Unavailable" };

/** One labelled figure. The whole panel is a description list, so every value is announced with
 *  the term it belongs to rather than as a loose number beside some text. */
const Row = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex gap-4">
    <dt className="text-text-muted">{label}:</dt>
    <dd>{value}</dd>
  </div>
);

/**
 * Step 4 — the read-only summary of everything the flow has collected, and of the world those
 * choices produced.
 *
 * §22's Career Setup Summary. The configuration half is the session the player typed; the world
 * half is counted off the provisional save through `getCareerSetupSummary`, which is why the
 * league-scope line (an estimate made before generation) and the competition line (the world on
 * disk) are deliberately not the same number restated.
 *
 * Strictly read-only, in the sense §22 means: the foundations cannot be edited here, and a player
 * who wants a different world starts a new career. Stepping back to the manager or the club is
 * untouched by that — neither is a foundation, and neither regenerates anything.
 */
export const ReviewPane = ({
  session,
}: {
  readonly session: CreationSession;
}) => {
  const provisionalId = provisionalIdOf(session.generation);
  const [summary, setSummary] = useState<SummaryState>({ _tag: "Loading" });

  useEffect(() => {
    if (provisionalId === null) {
      setSummary({ _tag: "Unavailable" });
      return;
    }

    let live = true;
    const load = async (): Promise<void> => {
      const outcome = await Effect.runPromise(
        getCareerSetupSummary(provisionalId).pipe(Effect.result),
      );
      if (!live) return;
      setSummary(
        Result.isFailure(outcome)
          ? { _tag: "Unavailable" }
          : { _tag: "Ready", view: outcome.success },
      );
    };

    void load();
    return () => {
      live = false;
    };
  }, [provisionalId]);

  const leagueScope =
    session.leagueSelection === null
      ? "Not selected"
      : `${session.leagueSelection.estimate.playableNationCount} playable nation${session.leagueSelection.estimate.playableNationCount === 1 ? "" : "s"
      }, ${session.leagueSelection.estimate.playableCompetitionCount
      } playable competition${session.leagueSelection.estimate.playableCompetitionCount === 1
        ? ""
        : "s"
      }`;

  return (
    <div className="text-text-body">
      <h2 className="text-lg font-semibold">Review Career</h2>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Save name" value={session.saveName} />
        <Row label="Manager name" value={session.managerName || session.saveName} />

        <div className="flex gap-4">
          <dt className="text-text-muted">Archetype:</dt>
          <dd className="capitalize">
            {session.archetype.replaceAll("_", " ")}
          </dd>
        </div>

        <Row label="Club" value={selectedClubOf(session)?.clubName ?? "Not selected"} />
        <Row label="League scope" value={leagueScope} />

        <div className="flex gap-4">
          <dt className="text-text-muted">Pillars:</dt>
          <dd>
            {session.pillars.tacticalAcumen}/{session.pillars.influence}/
            {session.pillars.regimen}/{session.pillars.technicalCoaching}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="career-setup-world" className="mt-6">
        <h3 id="career-setup-world" className="text-sm font-semibold">
          Generated world
        </h3>

        {/* The heading and its region stay mounted through every state, so the arriving summary
            extends the panel rather than replacing something the player was already reading. The
            status line is polite: nothing here interrupts, and nothing here blocks Create Career. */}
        {summary._tag === "Loading" ? (
          <p role="status" className="mt-2 text-sm text-text-muted">
            Reading the generated world…
          </p>
        ) : summary._tag === "Unavailable" ? (
          <p role="status" className="mt-2 text-sm text-text-muted">
            World summary unavailable. Your career is ready to create.
          </p>
        ) : (
          <dl className="mt-2 space-y-2 text-sm">
            <Row
              label="Starting season"
              value={`${summary.view.seasonLabel} · starts ${formatCalendarDate(summary.view.seasonStartDate)}`}
            />
            <Row label="Nations" value={summary.view.nationCount.toLocaleString()} />
            <Row
              label="Competitions"
              value={describeCompetitions(summary.view.competitions)}
            />
            <Row label="Clubs" value={summary.view.clubCount.toLocaleString()} />
            <Row label="Players generated" value={summary.view.playerCount.toLocaleString()} />
            <Row label="Staff" value={describeStaff(summary.view.staffCount)} />
          </dl>
        )}
      </section>
    </div>
  );
};
