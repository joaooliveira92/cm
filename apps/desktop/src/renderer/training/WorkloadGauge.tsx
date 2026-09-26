import {
  displayCondition,
  recoveryStatus,
  type LastInjurySeverity,
  type RecoveryIndicator,
} from "./recoveryStatus.js";

/**
 * The workload gauge: one player's Condition as a filled bar plus the Rest/Active indicator and the
 * last injury detail.
 *
 * Built to be lifted into Screens 105 (Training Overview) and 114 (Player Development Centre)
 * unchanged: it takes the player's Condition, recovery indicator, and last injury Severity as props,
 * formats them through `recoveryStatus`, and reads no atom, route, or context. The caller names the
 * player so the meter's accessible label stays meaningful wherever the gauge is placed.
 */
export const WorkloadGauge = ({
  playerName,
  condition,
  recovery,
  lastInjurySeverity,
}: {
  readonly playerName: string;
  readonly condition: number;
  readonly recovery: RecoveryIndicator;
  readonly lastInjurySeverity: LastInjurySeverity;
}) => {
  const value = displayCondition(condition);
  const status = recoveryStatus(recovery, lastInjurySeverity);
  const resting = recovery === "rest";

  return (
    <div className="flex min-w-0 flex-col gap-1" data-recovery={recovery}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="tabular-nums text-text-secondary">Condition {value}%</span>
        <span className={`font-semibold ${resting ? "text-text-warning" : "text-text-success"}`}>
          {status.label}
        </span>
      </div>
      <div
        role="meter"
        aria-label={`${playerName} Condition`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}%, ${status.label}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full ${resting ? "bg-text-warning" : "bg-text-success"}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-xs text-text-secondary">{status.detail}</p>
    </div>
  );
};
