import { useEffect, useState } from "react";
import type { CareerSetupSummaryView } from "@cm-clone/contracts";
import { formatCalendarDate, nationName } from "@cm-clone/shared";
import { Effect, Result } from "effect";
import { Badge } from "../components/ui/badge.js";
import { KeyValueKey, KeyValueList, KeyValueRow, KeyValueValue } from "../components/ui/key-value.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import { getCareerSetupSummary } from "../rpc.js";
import type { CreationSession } from "../router/createSessionContext.js";
import { selectedClubOf } from "./clubSelection.js";
import { selectedFavoriteTeamOf } from "./favoriteTeam.js";
import { describeCompetitions, describeStaff } from "./careerSetupSummary.js";
import { provisionalIdOf } from "./generation.js";
import { StepHeading } from "./StepHeading.js";

type SummaryState =
  | { readonly _tag: "Loading" }
  | { readonly _tag: "Ready"; readonly view: CareerSetupSummaryView }
  | { readonly _tag: "Unavailable" };

// The rows the Ready world summary renders below; the tab badge counts them.
const WORLD_FIGURE_COUNT = 6;

const Row = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <KeyValueRow className="items-center py-1.5">
    <KeyValueKey className="text-text-muted">{label}:</KeyValueKey>
    <KeyValueValue>{value}</KeyValueValue>
  </KeyValueRow>
);

export const ReviewPane = ({
  session,
}: {
  readonly session: CreationSession;
}) => {
  const provisionalId = provisionalIdOf(session.generation);
  const [summary, setSummary] = useState<SummaryState>({ _tag: "Loading" });
  // With no provisional world there is nothing to summarise; the state is derived rather than set
  // from an effect so it lands in the same commit that drops the world.
  const summaryState: SummaryState = provisionalId === null ? { _tag: "Unavailable" } : summary;

  useEffect(() => {
    if (provisionalId === null) return;

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
    { label: "Archetype", value: session.archetype.replaceAll("_", " ") },
    { label: "Club", value: selectedClubOf(session)?.clubName ?? "Not selected" },
    { label: "League scope", value: leagueScope },
    { label: "Pillars", value: `${session.pillars.tacticalAcumen}/${session.pillars.influence}/${session.pillars.regimen}/${session.pillars.technicalCoaching}` },
  ];

  return (
    <div className="text-text-soft">
      <StepHeading title="Review Career">
        Confirm everything the flow has collected before your career begins.
      </StepHeading>

      {/* Both panels stay mounted, so the world summary keeps loading while the player reads their
          choices, and switching tabs never re-reads it. */}
      <Tabs defaultValue="choices" className="mt-6">
        <TabsList variant="line" aria-label="Review sections" className="w-full justify-start">
          <TabsTrigger value="choices" className="gap-2">
            Your Choices
            <Badge variant="primary-light">{configurationItems.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="world" className="gap-2">
            Generated world
            {summaryState._tag === "Ready" ? (
              <Badge variant="primary-light">{WORLD_FIGURE_COUNT}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="choices" keepMounted>
          <div className="rounded-panel border border-panel-border bg-card p-6 shadow-panel">
            <KeyValueList className="divide-y divide-panel-border/30">
              {configurationItems.map((item) => (
                <Row key={item.label} label={item.label} value={item.value} />
              ))}
            </KeyValueList>
          </div>
        </TabsContent>

        <TabsContent value="world" keepMounted>
          <div className="rounded-panel border border-panel-border bg-card p-6 shadow-panel">
            {/* The status line is polite: nothing here interrupts, and nothing here blocks Create
                Career. */}
            {summaryState._tag === "Loading" ? (
              <p role="status" className="py-2 text-body text-text-muted">
                Reading the generated world…
              </p>
            ) : summaryState._tag === "Unavailable" ? (
              <p role="status" className="py-2 text-body text-text-muted">
                World summary unavailable. Your career is ready to create.
              </p>
            ) : (
              <KeyValueList className="divide-y divide-panel-border/30">
                <Row
                  label="Starting season"
                  value={`${summaryState.view.seasonLabel} · starts ${formatCalendarDate(summaryState.view.seasonStartDate)}`}
                />
                <Row label="Nations" value={summaryState.view.nationCount.toLocaleString()} />
                <Row
                  label="Competitions"
                  value={describeCompetitions(summaryState.view.competitions)}
                />
                <Row label="Clubs" value={summaryState.view.clubCount.toLocaleString()} />
                <Row label="Players generated" value={summaryState.view.playerCount.toLocaleString()} />
                <Row label="Staff" value={describeStaff(summaryState.view.staffCount)} />
              </KeyValueList>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
