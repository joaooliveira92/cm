import type { BattleManifest } from "@bluewave/campaign-engine";

import { Badge } from "../../../components/ui/badge.js";

interface BattleManifestViewProps {
  readonly manifest: BattleManifest;
}

export function BattleManifestView({ manifest }: BattleManifestViewProps) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/10 p-3 font-mono text-xs">
      <div className="flex items-center justify-between border-b pb-1">
        <span className="font-semibold text-foreground">BATTLE: {manifest.battleId}</span>
        <Badge variant="outline" className="font-mono text-[12px]">
          {manifest.missionType}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[12px] text-muted-foreground">ATTACKER</div>
          <div className="font-semibold text-foreground">United Kingdom (Player)</div>
          <div className="mt-1 text-[12px] text-muted-foreground">SQUADRONS:</div>
          {manifest.sides[0]?.participants.map((p, idx) => (
            <div key={idx} className="text-[12px]">
              • {p.shipId} ({p.divisionId})
            </div>
          ))}
        </div>
        <div>
          <div className="text-[12px] text-muted-foreground">DEFENDER</div>
          <div className="font-semibold text-foreground">German Empire (AI)</div>
          <div className="mt-1 text-[12px] text-muted-foreground">SQUADRONS:</div>
          {manifest.sides[1]?.participants.map((p, idx) => (
            <div key={idx} className="text-[12px]">
              • {p.shipId} ({p.divisionId})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
