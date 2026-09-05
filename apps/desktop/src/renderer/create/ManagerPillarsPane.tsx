/**
 * The pillar-allocation sub-step: the remaining-points readout, the four
 * stepper controls, and the validation/low-pillar warnings. Extracted from
 * `ManagerIdentityStep.tsx` along the `ManagerSubStep` seam; the DOM it emits,
 * its ARIA labels and its focus order are unchanged.
 */
import { useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PillarDistribution } from "@cm-clone/shared";
import { MANAGER_PILLARS, validatePillarDistribution } from "@cm-clone/shared";
import { Alert } from "../components/ui/alert.js";
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

export interface ManagerPillarsPaneProps {
  pillars: PillarDistribution;
  onPillarsChange: (pillars: PillarDistribution) => void;
}

export const ManagerPillarsPane = ({
  pillars,
  onPillarsChange,
}: ManagerPillarsPaneProps) => {
  const totalPoints = useMemo(() => sumPillars(pillars), [pillars]);
  const pointsRemaining = TOTAL_PILLAR_POINTS - totalPoints;

  const pillarErrors = useMemo(
    () => validatePillarDistribution(pillars),
    [pillars],
  );

  const lowPillars = useMemo(
    () =>
      MANAGER_PILLARS.filter(
        (pillar) => pillars[pillar] === MIN_PILLAR_VALUE,
      ),
    [pillars],
  );

  const handlePillarChange = useCallback(
    (pillar: Pillar, delta: -1 | 1): void => {
      const currentValue = pillars[pillar];
      const nextValue = Math.min(
        MAX_PILLAR_VALUE,
        Math.max(MIN_PILLAR_VALUE, currentValue + delta),
      );

      if (nextValue === currentValue) {
        return;
      }

      onPillarsChange({
        ...pillars,
        [pillar]: nextValue,
      });
    },
    [onPillarsChange, pillars],
  );

  return (
    <>
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Step 2
        </span>
        <h2 className="mt-2 text-2xl font-bold text-text-primary">
          Manager identity
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          Allocate the strengths that define your managerial career.
        </p>
      </div>


      <div className="overflow-hidden rounded-panel border border-panel-border bg-panel-bg shadow-panel">
        <div className="flex flex-col gap-4 border-b border-panel-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-text-primary">
              Pillar distribution
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Balance the qualities that shape your management style.
            </p>
          </div>

          <motion.div
            layout
            className={`rounded-panel border px-4 py-2 text-center ${pointsRemaining === 0
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
                  className={`block text-md font-bold tabular-nums ${pointsRemaining === 0
                    ? "text-text-success"
                    : pointsRemaining > 0
                      ? "text-text-warning"
                      : "text-destructive"
                    }`}
                >
                  {pointsRemaining === 0
                    ? "Ready"
                    : Math.abs(pointsRemaining)}
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
        </div>

        <div className="grid gap-px bg-panel-border md:grid-cols-2">
          {MANAGER_PILLARS.map((pillar) => {
            const value = pillars[pillar];
            const isMinimum = value === MIN_PILLAR_VALUE;

            return (
              <div
                key={pillar}
                className="bg-card p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium text-text-primary">
                    {PILLAR_DISPLAY_NAMES[pillar]}
                  </span>

                  <AnimatePresence>
                    {isMinimum && (
                      <motion.span
                        initial={{
                          opacity: 0,
                          scale: 0.5,
                          rotate: -15,
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          rotate: 0,
                        }}
                        exit={{
                          opacity: 0,
                          scale: 0.5,
                          rotate: 15,
                        }}
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
                    onClick={() => handlePillarChange(pillar, -1)}
                    disabled={
                      value <= MIN_PILLAR_VALUE
                    }
                  >
                    −
                  </Button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-center">
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={value}
                          initial={{
                            opacity: 0,
                            y: -6,
                            scale: 0.8,
                          }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            scale: 1,
                          }}
                          exit={{
                            opacity: 0,
                            y: 6,
                            scale: 0.8,
                          }}
                          className={`inline-block text-lg font-bold tabular-nums ${isMinimum
                            ? "text-text-warning"
                            : "text-text-primary"
                            }`}
                        >
                          {value}
                        </motion.span>
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-1.5">
                      {Array.from(
                        { length: MAX_PILLAR_VALUE },
                        (_, index) => {
                          const active = index < value;

                          return (
                            <motion.div
                              key={index}
                              className={`h-2 flex-1 rounded-full ${active
                                ? PILLAR_ACCENTS[pillar]
                                : "bg-surface-raised"
                                }`}
                              animate={{
                                scaleY: active ? 1 : 0.65,
                                opacity: active ? 1 : 0.5,
                              }}
                              transition={{
                                type: "spring",
                                stiffness: 450,
                                damping: 28,
                              }}
                            />
                          );
                        },
                      )}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label={`Increase ${PILLAR_DISPLAY_NAMES[pillar]}`}
                    onClick={() => handlePillarChange(pillar, 1)}
                    disabled={
                      value >= MAX_PILLAR_VALUE
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {pillarErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
          >
            <Alert variant="destructive">
              <ul className="space-y-1 text-sm">
                {pillarErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {lowPillars.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
          >
            <Alert className="border-text-warning/40 bg-text-warning/10">
              <h4 className="text-sm font-medium text-text-warning">
                Pillar warnings
              </h4>
              <ul className="mt-3 space-y-3 text-xs leading-relaxed text-text-warning">
                {lowPillars.map((pillar) => (
                  <motion.li
                    key={pillar}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <strong>{PILLAR_DISPLAY_NAMES[pillar]}:</strong>{" "}
                    {PILLAR_WARNINGS[pillar]}
                  </motion.li>
                ))}
              </ul>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
