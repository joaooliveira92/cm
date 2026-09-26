import { createContext, use, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PillarDistribution as PillarDistType } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import {
  MAX_PILLAR_VALUE,
  MIN_PILLAR_VALUE,
  PILLAR_ACCENTS,
  PILLAR_DISPLAY_NAMES,
  PILLAR_WARNINGS,
  TOTAL_PILLAR_POINTS,
  sumPillars,
  type Pillar,
} from "./managerIdentityCopy.js";

interface PillarDistValue {
  readonly pillars: PillarDistType;
  readonly handleChange: (pillar: Pillar, delta: -1 | 1) => void;
  readonly pointsRemaining: number;
  readonly totalPoints: number;
}

const PillarDistContext = createContext<PillarDistValue | null>(null);

const usePillarDist = () => {
  const ctx = use(PillarDistContext);
  if (ctx === null) {
    throw new Error("PillarDistribution.* must be inside PillarDistribution.Root");
  }
  return ctx;
};

const PillarDistributionRoot = ({
  pillars,
  onPillarsChange,
  children,
}: {
  readonly pillars: PillarDistType;
  readonly onPillarsChange: (pillars: PillarDistType) => void;
  readonly children: React.ReactNode;
}) => {
  const totalPoints = useMemo(() => sumPillars(pillars), [pillars]);
  const pointsRemaining = TOTAL_PILLAR_POINTS - totalPoints;

  const handleChange = useCallback(
    (pillar: Pillar, delta: -1 | 1): void => {
      const currentValue = pillars[pillar];
      const nextValue = Math.min(
        MAX_PILLAR_VALUE,
        Math.max(MIN_PILLAR_VALUE, currentValue + delta),
      );
      if (nextValue === currentValue) return;
      onPillarsChange({ ...pillars, [pillar]: nextValue });
    },
    [onPillarsChange, pillars],
  );

  return (
    <PillarDistContext value={{ pillars, handleChange, pointsRemaining, totalPoints }}>
      {children}
    </PillarDistContext>
  );
};

const PillarDistributionSummary = () => {
  const { pointsRemaining, totalPoints } = usePillarDist();

  return (
    <motion.div
      layout
      className={`rounded-panel border px-4 py-2 text-center ${
        pointsRemaining === 0
          ? "border-text-success/30 bg-text-success/10"
          : pointsRemaining > 0
            ? "border-text-warning/30 bg-text-warning/10"
            : "border-destructive/30 bg-destructive/10"
      }`}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={pointsRemaining}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
        >
          <span
            className={`block text-md font-bold tabular-nums ${
              pointsRemaining === 0
                ? "text-text-success"
                : pointsRemaining > 0
                  ? "text-text-warning"
                  : "text-destructive"
            }`}
          >
            {pointsRemaining === 0 ? "Ready" : Math.abs(pointsRemaining)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {pointsRemaining === 0
              ? `${totalPoints} points assigned`
              : pointsRemaining > 0
                ? "Points remaining"
                : "Points over"}
          </span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

const PillarDistributionSlider = ({ pillar }: { readonly pillar: Pillar }) => {
  const { pillars, handleChange } = usePillarDist();
  const value = pillars[pillar];
  const isMinimum = value === MIN_PILLAR_VALUE;

  return (
    <div className="bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="font-medium text-text-primary">
          {PILLAR_DISPLAY_NAMES[pillar]}
        </span>

        <AnimatePresence>
          {isMinimum && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 15 }}
              className="text-text-warning"
              title={PILLAR_WARNINGS[pillar]}
              role="img"
              aria-label={PILLAR_WARNINGS[pillar]}
            >
              ⚠
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Decrease ${PILLAR_DISPLAY_NAMES[pillar]}`}
          onClick={() => handleChange(pillar, -1)}
          disabled={value <= MIN_PILLAR_VALUE}
        >
          −
        </Button>

        <div className="min-w-0 flex-1">
          <div className="mb-2 text-center">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={value}
                initial={{ opacity: 0, y: -6, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.8 }}
                className={`inline-block text-lg font-bold tabular-nums ${
                  isMinimum ? "text-text-warning" : "text-text-primary"
                }`}
              >
                {value}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="flex gap-1.5">
            {Array.from({ length: MAX_PILLAR_VALUE }, (_, index) => {
              const active = index < value;
              return (
                <motion.div
                  key={index}
                  className={`h-2 flex-1 rounded-full ${
                    active ? PILLAR_ACCENTS[pillar] : "bg-surface-raised"
                  }`}
                  animate={{ scaleY: active ? 1 : 0.65, opacity: active ? 1 : 0.5 }}
                  transition={{ type: "spring", stiffness: 450, damping: 28 }}
                />
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label={`Increase ${PILLAR_DISPLAY_NAMES[pillar]}`}
          onClick={() => handleChange(pillar, 1)}
          disabled={value >= MAX_PILLAR_VALUE}
        >
          +
        </Button>
      </div>
    </div>
  );
};

export const PillarDistribution = {
  Root: PillarDistributionRoot,
  Summary: PillarDistributionSummary,
  Slider: PillarDistributionSlider,
};