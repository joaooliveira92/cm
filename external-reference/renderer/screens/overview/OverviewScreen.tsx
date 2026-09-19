import {
  Anchor,
  Banknote,
  Flag,
  FlaskConical,
  Hammer,
  LayoutDashboard,
  MapPin,
  Ship,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../components/shared/PageHeader.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import type { Screen } from "../../shell/AppSidebar.js";
import {
  applyLoadFailed,
  applyProjectionLoaded,
  initialOverviewScreenState,
  monthLabel,
  summarizeFleet,
  totalPortCapacity,
  largestPortCapacity,
  rederivedMaintenanceCost,
  shipsByType,
  activeConstructionCount,
} from "./overview-screen-state.js";
import { GlassCard } from "@/components/ui/glass-card.js";
import { tensionLabel } from "@bluewave/campaign-engine";

export interface OverviewScreenProps {
  readonly sessionId: string;
  readonly onNavigate: (screen: Screen) => void;
}

interface PriorityItem {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly severity: string;
  readonly destination: Screen;
}

export function OverviewScreen({ sessionId, onNavigate }: OverviewScreenProps) {
  const bridge = window.bluewave;
  const [state, setState] = useState(initialOverviewScreenState);

  const loadScreen = useCallback(async () => {
    if (bridge === undefined) {
      setState((current) => applyLoadFailed(current, "Bluewave bridge not available"));
      return;
    }
    const result = await bridge.campaign.execute("inspectCampaign", sessionId);
    if (result.outcome !== "success") {
      setState((current) => applyLoadFailed(current, result.reason));
      return;
    }
    setState((current) => applyProjectionLoaded(current, result.value.projection));
  }, [bridge, sessionId]);

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  const { projection, loadError } = state;

  if (loadError !== null) {
    return (
      <div data-guided-target="overview">
        <GlassCard glassVariant="liquid-refract" className="border-destructive/50">
          <CardContent className="p-4 text-destructive">
            Failed to load campaign overview: {loadError}
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  if (projection === null) {
    return (
      <div data-guided-target="overview" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <Skeleton key={idx} className="h-28" />
        ))}
      </div>
    );
  }

  const fleetSummary = summarizeFleet(projection);
  const byType = shipsByType(projection);
  const maintenance = rederivedMaintenanceCost(projection);
  const largestPort = largestPortCapacity(projection);
  const constructionCount = activeConstructionCount(projection);

  // Foreign Situation: top 3 highest-tension — projection lacks per-relation tension,
  // so we derive from knownEnemyNations as high-tension proxies (tension 10 = war).
  // Uses imported tensionLabel, never renderer-re-derived.
  const foreignRelations = projection.knownEnemyNations.slice(0, 3).map((nationId) => ({
    nationId,
    tension: 10,
    label: tensionLabel(10),
  }));

  // Immediate Priorities: placeholder until wired to buildPrioritiesProjection
  // (INC-2) snapshot data. Honest empty-state copy verbatim per spec.
  const priorities: readonly PriorityItem[] = [];

  return (
    <div data-guided-target="overview" className="space-y-8">
      <PageHeader
        icon={LayoutDashboard}
        title="Campaign Overview"
        description={
          <>
            {monthLabel(projection.month)} · Revision {projection.revision} · Session{" "}
            <span className="font-mono">{sessionId}</span>
          </>
        }
      />

      {/* Header summary: admiralName (M1 identity) → campaign name, fleet strength, construction count, highest tension */}
      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Admiralty Header</CardTitle>
          <CardDescription>
            {projection.nationName} · {projection.campaignIdentity}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-xs">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Fleet Strength
            </p>
            <p className="mt-0.5 font-medium">
              {fleetSummary.totalShips} ships · {fleetSummary.divisionCount} divisions
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Active Construction
            </p>
            <p className="mt-0.5 font-medium">{constructionCount} projects</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Highest Tension
            </p>
            <p className="mt-0.5 font-medium">
              {foreignRelations.length === 0
                ? "—"
                : `${foreignRelations[0]!.nationId} (${foreignRelations[0]!.tension} · ${foreignRelations[0]!.label})`}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Funds</p>
            <p className="mt-0.5 font-medium">
              {projection.economy.treasury.toLocaleString()} · projected{" "}
              {projection.projectedSurplusDeficit.toLocaleString()}
            </p>
          </div>
        </CardContent>
      </GlassCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Banknote className="h-4 w-4 text-muted-foreground" />
              Treasury
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              {projection.economy.treasury.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              +{projection.economy.monthlyAppropriation.toLocaleString()} / month
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Ship className="h-4 w-4 text-muted-foreground" />
              Fleet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">{fleetSummary.totalShips}</p>
            <p className="text-xs text-muted-foreground">
              {fleetSummary.divisionCount} division
              {fleetSummary.divisionCount === 1 ? "" : "s"} across {fleetSummary.fleetCount} fleet
              {fleetSummary.fleetCount === 1 ? "" : "s"}
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Hammer className="h-4 w-4 text-muted-foreground" />
              Shipyard Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              {projection.economy.shipyardCapacity}
            </p>
            <p className="text-xs text-muted-foreground">capacity units available</p>
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <FlaskConical className="h-4 w-4 text-muted-foreground" />
              Research
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              {projection.knownTechnologyIds.length}
            </p>
            <p className="text-xs text-muted-foreground">technologies known</p>
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Strategic Presence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">{projection.ports.length}</p>
            <p className="text-xs text-muted-foreground">
              ports · {totalPortCapacity(projection)} capacity · {projection.strategicAreas.length}{" "}
              areas
            </p>
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Flag className="h-4 w-4 text-muted-foreground" />
              Diplomacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tracking-tight">
              {projection.knownEnemyNations.length}
            </p>
            <p className="text-xs text-muted-foreground">
              {projection.knownEnemyNations.length === 0
                ? "no known enemies"
                : projection.knownEnemyNations.join(", ")}
            </p>
          </CardContent>
        </GlassCard>
      </div>

      {/* Naval Position — fresh derivations, maintenance re-derived */}
      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Ship className="h-4 w-4 text-muted-foreground" />
            Naval Position
          </CardTitle>
          <CardDescription>
            Derived from fleet and port data — no aggregate reads where spec says derive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Active ships by type
              </p>
              <p className="mt-0.5 font-medium">
                {byType.size === 0
                  ? "—"
                  : Array.from(byType.entries())
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Total monthly maintenance (re-derived)
              </p>
              <p className="mt-0.5 font-medium">{maintenance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Largest port capacity
              </p>
              <p className="mt-0.5 font-medium">{largestPort.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Active construction
              </p>
              <p className="mt-0.5 font-medium">{constructionCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Construction / Research spend
              </p>
              <p className="mt-0.5 font-medium">
                {projection.economy.constructionSpend.toLocaleString()} /{" "}
                {projection.economy.researchSpend.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Foreign Situation — top 3 tension via imported tensionLabel, no trend */}
      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Flag className="h-4 w-4 text-muted-foreground" />
            Foreign Situation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {foreignRelations.length === 0 ? (
            <p className="text-muted-foreground">No foreign relations.</p>
          ) : (
            foreignRelations.map((rel) => (
              <div key={rel.nationId} className="flex items-center justify-between">
                <span className="font-medium">{rel.nationId}</span>
                <span className="text-muted-foreground">
                  {rel.tension} · {rel.label}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </GlassCard>

      {/* Immediate Priorities — cap 5, severity-sorted, destination links, verbatim empty-state */}
      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            Immediate Priorities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {priorities.length === 0 ? (
            <p className="text-muted-foreground">
              The Admiralty has identified no urgent concerns.
            </p>
          ) : (
            priorities.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-muted-foreground">{p.summary}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate(p.destination)}>
                  {p.destination}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </GlassCard>

      {/* Recent Developments — honest empty state until INC-12 */}
      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Info className="h-4 w-4 text-muted-foreground" />
            Recent Developments
          </CardTitle>
          <CardDescription>From the most recent Monthly Naval Estimates report.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>No monthly developments yet.</p>
        </CardContent>
      </GlassCard>

      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <CardDescription>Jump straight to the relevant desk.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigate("construction")}>
            <Hammer className="h-3.5 w-3.5" />
            Construction
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("fleet")}>
            <Ship className="h-3.5 w-3.5" />
            Fleet
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate("simulation")}>
            <Anchor className="h-3.5 w-3.5" />
            Simulation & Turn
          </Button>
        </CardContent>
      </GlassCard>

      <GlassCard glassVariant="liquid-refract">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Campaign Identity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 font-mono text-xs">
          <div>
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground">
              Campaign ID
            </p>
            <p className="mt-0.5">{projection.campaignIdentity}</p>
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-wider text-muted-foreground">
              Snapshot Hash
            </p>
            <Badge variant="outline" className="mt-0.5 font-mono">
              {projection.snapshotHash.slice(0, 16)}…
            </Badge>
          </div>
        </CardContent>
      </GlassCard>
    </div>
  );
}
