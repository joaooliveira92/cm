import { useEffect, useState } from "react";
import type { CareerSetupSummaryView } from "@cm-clone/contracts";
import { formatCalendarDate, nationName } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { getCareerSetupSummary } from "../rpc.js";
import type { CreationSession } from "../router/createSessionContext.js";
import { selectedClubOf } from "./clubSelection.js";
import { selectedFavoriteTeamOf } from "./favoriteTeam.js";
import { STYLE_LABELS } from "./managerStyleCopy.js";
import { describeCompetitions, describeStaff } from "./careerSetupSummary.js";
import { provisionalIdOf } from "./generation.js";
import { StepHeading } from "./StepHeading.js";

type SummaryState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Ready"; readonly view: CareerSetupSummaryView }
  | { readonly _tag: "Unavailable" };

const Row = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="flex items-center justify-between gap-4 py-1.5">
    <dt className="text-text-muted">{label}:</dt>
    <dd className="text-text-primary font-medium">{value}</dd>
  </div>
);

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

  const configurationItems = [
    { label: "Manager", value: `${session.firstName} ${session.lastName}`.trim() },
    { label: "Nationality", value: session.nationalityId === null ? "Not selected" : nationName(session.nationalityId) },
    { label: "Date of birth", value: session.dateOfBirth || "Not selected" },
    { label: "Favorite team", value: selectedFavoriteTeamOf(session)?.clubName ?? "None" },
    { label: "Formation", value: session.preferredFormation ?? "Not selected" },
    { label: "Tactical style", value: session.preferredStyleId === null ? "Not selected" : STYLE_LABELS[session.preferredStyleId] },
    { label: "Archetype", value: session.archetype.replaceAll("_", " ") },
    { label: "Club", value: selectedClubOf(session)?.clubName ?? "Not selected" },
    { label: "League scope", value: leagueScope },
    { label: "Pillars", value: `${session.pillars.tacticalAcumen}/${session.pillars.influence}/${session.pillars.regimen}/${session.pillars.technicalCoaching}` },
  ];

  return (
    <div className="text-text-body">
      <StepHeading title="Review Career">
        Confirm everything the flow has collected before your career begins.
      </StepHeading>

      <div className="mt-6 rounded-panel border border-panel-border bg-card p-6 shadow-panel">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Your Choices
        </h3>
        <dl className="divide-y divide-panel-border/30">
          {configurationItems.map((item) => (
            <Row key={item.label} label={item.label} value={item.value} />
          ))}
        </dl>
      </div>

      <section aria-labelledby="career-setup-world" className="mt-6">
        <div className="rounded-panel border border-panel-border bg-card p-6 shadow-panel">
          <h3 id="career-setup-world" className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Generated world
          </h3>

          {/* The heading and its region stay mounted through every state, so the arriving summary
              extends the panel rather than replacing something the player was already reading. The
              status line is polite: nothing here interrupts, and nothing here blocks Create Career. */}
          {summary._tag === "Loading" ? (
            <p role="status" className="py-2 text-sm text-text-muted">
              Reading the generated world…
            </p>
          ) : summary._tag === "Unavailable" ? (
            <p role="status" className="py-2 text-sm text-text-muted">
              World summary unavailable. Your career is ready to create.
            </p>
          ) : (
            <dl className="divide-y divide-panel-border/30">
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
        </div>
      </section>
    </div>
  );
};
