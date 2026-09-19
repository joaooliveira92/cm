import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PillarDistribution as PillarDistType } from "@cm-clone/shared";
import { MANAGER_PILLARS, validatePillarDistribution } from "@cm-clone/shared";
import { Alert } from "../components/ui/alert.js";
import {
  MIN_PILLAR_VALUE,
  PILLAR_DISPLAY_NAMES,
  PILLAR_WARNINGS,
} from "./managerIdentityCopy.js";
import { PillarDistribution } from "./PillarDistribution.js";

export interface ManagerPillarsPaneProps {
  pillars: PillarDistType;
  onPillarsChange: (pillars: PillarDistType) => void;
}

export const ManagerPillarsPane = ({
  pillars,
  onPillarsChange,
}: ManagerPillarsPaneProps) => {
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

      <PillarDistribution.Root
        pillars={pillars}
        onPillarsChange={onPillarsChange}
      >
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

            <PillarDistribution.Summary />
          </div>

          <div className="grid gap-px bg-panel-border md:grid-cols-2">
            {MANAGER_PILLARS.map((pillar) => (
              <PillarDistribution.Slider key={pillar} pillar={pillar} />
            ))}
          </div>
        </div>
      </PillarDistribution.Root>

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