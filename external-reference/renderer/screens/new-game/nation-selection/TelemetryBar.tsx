import { Compass } from "lucide-react";

export function TelemetryBar({ coordinateLabel }: { coordinateLabel: string }): React.JSX.Element {
  return (
    <section
      className="h-8 flex-none border-b border-[#141f2d] bg-[#05080e] px-6 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#526a85]"
      aria-label="Tactical Status Bar"
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-[#d4a359]/80">
          <Compass className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "12s" }} />
          <span>Telemetry Lock:</span>
        </div>
        <span className="text-white tabular-nums tracking-normal">{coordinateLabel}</span>
      </div>
      <div className="hidden md:flex items-center gap-6 text-[#3c4e63]">
        <span>
          NAVIGATE:{" "}
          <kbd className="text-[#d4a359] bg-[#090f17] px-1.5 py-0.5 rounded border border-[#141f2d]">
            ↑↓←→
          </kbd>
        </span>
        <span>
          CONFIRM:{" "}
          <kbd className="text-[#d4a359] bg-[#090f17] px-1.5 py-0.5 rounded border border-[#141f2d]">
            ENTER
          </kbd>
        </span>
        <span>
          ABORT:{" "}
          <kbd className="text-[#d4a359] bg-[#090f17] px-1.5 py-0.5 rounded border border-[#141f2d]">
            ESC
          </kbd>
        </span>
      </div>
    </section>
  );
}
