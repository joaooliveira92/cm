import type { BattleResolution, TacticalBattleOutcome } from "@bluewave/campaign-engine";
import { Radar, Sword, Waves } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card.js";
import { useSandbox } from "./SandboxProvider.js";

export function SandboxOutcomeCard() {
  const { state } = useSandbox();
  const autoResolution = state.autoResolution;
  const outcome = state.tacticalOutcome;
  return (
    <>
      {autoResolution !== null && <AutoResolutionCard resolution={autoResolution} />}
      {outcome !== null && <TacticalOutcomeSection outcome={outcome} />}
    </>
  );
}

function AutoResolutionCard({ resolution }: { readonly resolution: BattleResolution }) {
  return (
    <Card className="border-success/30 bg-success/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-success">
          <Sword className="h-4 w-4" />
          Auto-Resolution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 font-mono text-xs">
        <p>
          Winner:{" "}
          <span className="font-medium">{resolution.missionOutcome.winner ?? "INCONCLUSIVE"}</span>{" "}
          · Outcome: {resolution.missionOutcome.outcomeKind} · War Score:{" "}
          {resolution.warScoreChange}
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[12px] uppercase text-muted-foreground">Attacker Ships</p>
            {resolution.attacker.ships.map((ship, idx) => (
              <div
                key={idx}
                className="flex justify-between border-b py-0.5 text-[12px] last:border-0"
              >
                <span>{ship.shipId}</span>
                <span className="font-medium">{ship.outcome}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[12px] uppercase text-muted-foreground">Defender Ships</p>
            {resolution.defender.ships.map((ship, idx) => (
              <div
                key={idx}
                className="flex justify-between border-b py-0.5 text-[12px] last:border-0"
              >
                <span>{ship.shipId}</span>
                <span className="font-medium">{ship.outcome}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TacticalOutcomeSection({ outcome }: { readonly outcome: TacticalBattleOutcome }) {
  return (
    <>
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-warning">
            <Radar className="h-4 w-4" />
            Tactical Outcome — {outcome.turnsResolved} turns resolved
          </CardTitle>
          <CardDescription>
            End condition: {outcome.endCondition} · War score: {outcome.warScoreChange} · Rejected
            orders: {outcome.rejectedOrders.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 font-mono text-xs md:grid-cols-4">
          <Stat label="Sea State" value={String(outcome.weather.seaState)} />
          <Stat label="Visibility (nm)" value={String(outcome.weather.visibilityNm)} />
          <Stat label="Precipitation" value={outcome.weather.precipitation} />
          <Stat label="Time of Day" value={outcome.weather.timeOfDay} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Gunnery — Milestone 2</CardTitle>
          <CardDescription>
            {outcome.gunneryResults.length} firing exchanges resolved
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-[220px] space-y-1 overflow-auto font-mono text-[12px]">
          {outcome.gunneryResults.length === 0 && (
            <p className="text-muted-foreground">No gunnery exchanges occurred.</p>
          )}
          {outcome.gunneryResults.map((resolution, idx) => (
            <div key={idx} className="border-b pb-1 last:border-0">
              <span className="font-medium">
                [T{resolution.turn}] {resolution.divisionId} → {resolution.targetDivisionId}
              </span>
              {resolution.shots.map((shot, shotIdx) => (
                <div key={shotIdx} className="pl-3 text-muted-foreground">
                  {shot.shooterShipId} → {shot.targetShipId}: {shot.hit ? "HIT" : "miss"} (
                  {shot.armorOutcome})
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
            <Waves className="h-4 w-4" />
            Torpedoes, Mines & Submarines — Milestone 3
          </CardTitle>
          <CardDescription>
            {outcome.battleReport.torpedoExpenditure.length} torpedo firings ·{" "}
            {outcome.mineStrikeEvents?.length ?? 0} mine strikes ·{" "}
            {outcome.submarineElementLosses?.reduce((sum, loss) => sum + loss.losses, 0) ?? 0}{" "}
            submarine losses
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 font-mono text-[12px] md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-muted-foreground uppercase">Torpedo Expenditure</p>
            {outcome.battleReport.torpedoExpenditure.length === 0 && (
              <p className="text-muted-foreground">None fired.</p>
            )}
            {outcome.battleReport.torpedoExpenditure.map((torpedo, idx) => (
              <div key={idx} className="flex justify-between border-b py-0.5 last:border-0">
                <span>
                  [T{torpedo.turn}] {torpedo.shipId} → {torpedo.targetShipId}
                </span>
                <span className="font-medium">{torpedo.hit ? "HIT" : "miss"}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground uppercase">Mine Strikes</p>
            {(outcome.mineStrikeEvents ?? []).length === 0 && (
              <p className="text-muted-foreground">None.</p>
            )}
            {(outcome.mineStrikeEvents ?? []).map((strike, idx) => (
              <div key={idx} className="flex justify-between border-b py-0.5 last:border-0">
                <span>
                  [T{strike.turn}] {strike.shipId}
                </span>
                <span className="font-medium">{strike.damageState}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 p-2">
      <div className="text-[12px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
