import { ArrowLeft, ArrowRight, Flag, Landmark, Radar } from "lucide-react";
import type { OpeningBriefingProjection } from "@bluewave/campaign-engine";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { InspectOpeningBriefingResult } from "../../../shared/campaign-command-contract.js";
import type { BridgeResult } from "../../../shared/bridge-contract.js";
import { NATION_DOSSIER_FIELDS } from "../../content/nationDossierFields.js";
import { NATION_FLAVOR_TEXT } from "../../content/nationFlavorText.js";
import type { PlayableSlotCountryId } from "../../content/nationAssetManifest.js";
import { Button } from "../../components/ui/button.js";
import { GlassCard } from "../../components/ui/glass-card.js";
import { formatCampaignMonth, formatTreasury } from "../../shell/site-header-state.js";
import { ScreenHeader } from "./components/ScreenHeader.js";
import {
  OPENING_BRIEFING_PAGE_COUNT,
  OPENING_BRIEFING_PAGE_TITLES,
  PAGE_1_NEXT_LABEL,
  PAGE_LAST_ACTION_LABEL,
  canGoBack,
  nextPageIndex,
  previousPageIndex,
} from "./new-game-briefing-screen-state.js";

export interface NewGameBriefingScreenProps {
  readonly sessionId: string;
  readonly onInspectOpeningBriefing: (
    sessionId: string,
  ) => Promise<BridgeResult<InspectOpeningBriefingResult>>;
  readonly onTakeCommand: () => void;
}

const EMPTY_PAGE_INDEX = 0;

function formatSignedMoney(value: number): string {
  const sign = value >= 0 ? "+" : "−";
  return `${sign}${formatTreasury(Math.abs(value))}`;
}

function DetailRow({ label, value }: { readonly label: string; readonly value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function AppointmentPage({
  projection,
  nationId,
}: {
  readonly projection: OpeningBriefingProjection;
  readonly nationId: PlayableSlotCountryId;
}) {
  const dossier = NATION_DOSSIER_FIELDS[nationId];
  const flavor = NATION_FLAVOR_TEXT[nationId];
  const title = dossier?.appointmentTitle ?? projection.nationName;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Appointment confirmed · {formatCampaignMonth(projection.month)}
        </p>
        <h2 className="mt-1 text-xl font-semibold">
          You have been appointed {title} — {projection.nationName}
        </h2>
      </div>
      {flavor !== undefined && (
        <GlassCard glassVariant="liquid-refract">
          <div className="flex flex-col gap-3 p-4">
            <p className="text-sm text-muted-foreground">{flavor.military}</p>
            <p className="text-sm text-muted-foreground">{flavor.economy}</p>
            <p className="text-sm text-muted-foreground">{flavor.diplomacy}</p>
          </div>
        </GlassCard>
      )}
      {dossier !== undefined && (
        <GlassCard glassVariant="liquid-refract">
          <div className="flex flex-col gap-2 p-4">
            <p className="text-sm text-muted-foreground">{dossier.doctrine}</p>
            <p className="text-sm text-muted-foreground">{dossier.strategicRegions}</p>
            <p className="text-sm text-muted-foreground">{dossier.nationalCharacteristics}</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function StateOfTheNavyPage({ projection }: { readonly projection: OpeningBriefingProjection }) {
  const { stateOfTheNavy } = projection;
  return (
    <div className="flex flex-col gap-4">
      <GlassCard glassVariant="liquid-refract">
        <div className="flex flex-col gap-1 p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Ship-class inventory
          </p>
          {stateOfTheNavy.shipClassCounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No commissioned ships on the roster.</p>
          ) : (
            stateOfTheNavy.shipClassCounts.map(({ label, count }) => (
              <DetailRow key={label} label={label} value={count} />
            ))
          )}
        </div>
      </GlassCard>
      <GlassCard glassVariant="liquid-refract">
        <div className="flex flex-col p-4">
          <DetailRow
            label="Ships under construction"
            value={stateOfTheNavy.shipsUnderConstruction}
          />
          <DetailRow
            label="Most expensive active class"
            value={
              stateOfTheNavy.mostExpensiveActiveClass === null
                ? "—"
                : `${stateOfTheNavy.mostExpensiveActiveClass.className} (${formatTreasury(stateOfTheNavy.mostExpensiveActiveClass.projectedCost)})`
            }
          />
          <DetailRow label="Largest available dock" value={stateOfTheNavy.largestDockCapacity} />
          <DetailRow
            label="Total maintenance expense"
            value={formatTreasury(stateOfTheNavy.totalMaintenance)}
          />
          <DetailRow
            label="Construction committed"
            value={formatTreasury(stateOfTheNavy.constructionCommitted)}
          />
        </div>
      </GlassCard>
    </div>
  );
}

function TreasuryPage({ projection }: { readonly projection: OpeningBriefingProjection }) {
  const { treasury } = projection;
  return (
    <div className="flex flex-col gap-4">
      <GlassCard glassVariant="liquid-refract">
        <div className="flex flex-col p-4">
          <DetailRow
            label="Government allocation"
            value={formatTreasury(treasury.governmentAllocation)}
          />
          <DetailRow
            label="Fleet maintenance"
            value={`−${formatTreasury(treasury.fleetMaintenance)}`}
          />
          <DetailRow
            label="Construction committed"
            value={`−${formatTreasury(treasury.constructionCommitted)}`}
          />
          <DetailRow
            label="Research expenditure"
            value={`−${formatTreasury(treasury.researchExpenditure)}`}
          />
          <DetailRow
            label="Projected surplus / deficit"
            value={formatSignedMoney(treasury.projectedSurplus)}
          />
        </div>
      </GlassCard>
      <GlassCard glassVariant="liquid-refract">
        <div className="p-4">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Treasury outlook
          </p>
          <p className="mt-1 text-sm font-medium capitalize">{treasury.status}</p>
        </div>
      </GlassCard>
    </div>
  );
}

function ForeignIntelligencePage({
  projection,
}: {
  readonly projection: OpeningBriefingProjection;
}) {
  const relations = projection.foreignIntelligence.relations;
  return (
    <GlassCard glassVariant="liquid-refract">
      <div className="flex flex-col p-4">
        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Relations by power
        </p>
        {relations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No foreign relations on record.</p>
        ) : (
          relations.map((relation) => (
            <DetailRow
              key={relation.nationId}
              label={relation.name}
              value={`${relation.relation.replaceAll("_", " ")} · tension ${relation.tension}`}
            />
          ))
        )}
      </div>
    </GlassCard>
  );
}

function ImmediateConcernsPage({ projection }: { readonly projection: OpeningBriefingProjection }) {
  const concerns = projection.immediateConcerns;
  return (
    <GlassCard glassVariant="liquid-refract">
      <div className="flex flex-col p-4">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Immediate concerns
        </p>
        {concerns.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pressing concerns to report.</p>
        ) : (
          concerns.map((concern) => (
            <div key={concern.category} className="flex items-start gap-2 py-1.5">
              <Flag className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">{concern.message}</p>
            </div>
          ))
        )}
      </div>
    </GlassCard>
  );
}

export function NewGameBriefingScreen({
  sessionId,
  onInspectOpeningBriefing,
  onTakeCommand,
}: NewGameBriefingScreenProps) {
  const [pageIndex, setPageIndex] = useState(EMPTY_PAGE_INDEX);
  const [projection, setProjection] = useState<OpeningBriefingProjection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setProjection(null);
    setError(null);
    setPageIndex(EMPTY_PAGE_INDEX);
    void onInspectOpeningBriefing(sessionId).then((result) => {
      if (!active) return;
      if (result.outcome !== "success") {
        setError(result.reason);
        return;
      }
      setProjection(result.value.projection);
    });
    return () => {
      active = false;
    };
  }, [sessionId, onInspectOpeningBriefing]);

  if (error !== null) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
        <ScreenHeader
          icon={<Flag />}
          title="Briefing unavailable"
          description={`The opening briefing could not be prepared. ${error}`}
        />
      </div>
    );
  }

  if (projection === null) {
    return (
      <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-8 text-center">
        <ScreenHeader
          icon={<Landmark />}
          title="Opening strategic briefing"
          description="Preparing the briefing…"
        />
      </div>
    );
  }

  const nationId = projection.nationId as PlayableSlotCountryId;
  const title = OPENING_BRIEFING_PAGE_TITLES[pageIndex] ?? "Opening Strategic Briefing";
  const pageContent: ReactNode =
    pageIndex === 0 ? (
      <AppointmentPage projection={projection} nationId={nationId} />
    ) : pageIndex === 1 ? (
      <StateOfTheNavyPage projection={projection} />
    ) : pageIndex === 2 ? (
      <TreasuryPage projection={projection} />
    ) : pageIndex === 3 ? (
      <ForeignIntelligencePage projection={projection} />
    ) : (
      <ImmediateConcernsPage projection={projection} />
    );

  const isLastPage = pageIndex === OPENING_BRIEFING_PAGE_COUNT - 1;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6 overflow-y-auto p-8">
      <ScreenHeader icon={<Landmark />} title="Opening Strategic Briefing" description={title} />

      <div className="flex items-center gap-1.5" aria-label="Briefing progress">
        {OPENING_BRIEFING_PAGE_TITLES.map((pageTitle, index) => (
          <span
            key={pageTitle}
            className={`h-1.5 flex-1 rounded-full ${index <= pageIndex ? "bg-primary" : "bg-border"}`}
            title={pageTitle}
          />
        ))}
      </div>

      {pageContent}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setPageIndex(previousPageIndex(pageIndex))}
          disabled={!canGoBack(pageIndex)}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>

        {isLastPage ? (
          <Button type="button" onClick={onTakeCommand}>
            {PAGE_LAST_ACTION_LABEL}
          </Button>
        ) : (
          <Button type="button" onClick={() => setPageIndex(nextPageIndex(pageIndex))}>
            {pageIndex === 0 ? PAGE_1_NEXT_LABEL : "Next"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div
        className="flex items-center gap-1.5 self-end text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <Radar className="size-3.5" />
        {formatCampaignMonth(projection.month)}
      </div>
    </div>
  );
}
