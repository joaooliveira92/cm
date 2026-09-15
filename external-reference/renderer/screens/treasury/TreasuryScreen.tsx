import { Wallet } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.js";
import { Badge } from "../../components/ui/badge.js";
import { CardContent, CardHeader, CardTitle } from "../../components/ui/card.js";
import { GlassCard } from "../../components/ui/glass-card.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import { summarizeTreasury } from "./treasury-screen-state.js";
import { useTreasuryScreen } from "./useTreasuryScreen.js";

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={muted === true ? "text-sm text-muted-foreground" : "text-sm"}>{label}</span>
      <span className="text-sm font-medium tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}

export interface TreasuryScreenProps {
  readonly sessionId: string;
}

export function TreasuryScreen({ sessionId }: TreasuryScreenProps) {
  const { state } = useTreasuryScreen(sessionId);

  const { projection, loadError } = state;

  if (loadError !== null) {
    return (
      <div data-guided-target="treasury">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load Treasury: {loadError}
        </div>
      </div>
    );
  }

  if (projection === null) {
    return (
      <div data-guided-target="treasury" className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2].map((idx) => (
          <Skeleton key={idx} className="h-28" />
        ))}
      </div>
    );
  }

  const t = summarizeTreasury(projection);

  return (
    <div data-guided-target="treasury" className="space-y-8">
      <PageHeader
        icon={Wallet}
        title="Treasury"
        description="Government naval allocation, expenditure, and projected position. Read-only."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Government naval allocation" value={t.income} />
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Expenditure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Fleet maintenance" value={t.fleetMaintenance} />
            <Row label="Construction" value={t.constructionSpend} />
            <Row label="Research" value={t.researchSpend} />
            <div className="h-px bg-border" />
            <Row label="Total expenditure" value={t.totalExpenditure} />
          </CardContent>
        </GlassCard>

        <GlassCard glassVariant="liquid-refract">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Row label="Projected surplus / deficit" value={t.projectedSurplusDeficit} />
            <Row label="Available funds" value={t.availableFunds} />
            <Row label="Projected month-end funds" value={t.projectedMonthEndFunds} />
            <Badge
              variant="outline"
              className={
                t.projectedSurplusDeficit < 0
                  ? "mt-1 border-destructive/50 text-destructive"
                  : "mt-1"
              }
            >
              {t.projectedSurplusDeficit < 0 ? "Deficit" : "Surplus"}
            </Badge>
          </CardContent>
        </GlassCard>
      </div>
    </div>
  );
}
