import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { PillarDistribution } from "@cm-clone/shared";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { FOCUS_RING } from "../focus.js";
import type { ManagerSubStep } from "../router/createSessionContext.js";
import { ManagerPillarsPane } from "./ManagerPillarsPane.js";
import { STEPS, panelVariants, type FormStep } from "./managerIdentityCopy.js";

export interface ManagerIdentityStepProps {
  saveName: string;
  managerName: string;
  pillars: PillarDistribution;
  /** The active sub-panel: 1 = personal details, 2 = manager identity. Owned by the
   *  creation session (and thus the shell's bottom bar), passed down as a controlled value. */
  step: ManagerSubStep;
  onStepChange: (step: ManagerSubStep) => void;
  onSaveNameChange: (name: string) => void;
  onManagerNameChange: (name: string) => void;
  onPillarsChange: (pillars: PillarDistribution) => void;
}

export const ManagerIdentityStep = ({
  saveName,
  managerName,
  pillars,
  step,
  onStepChange,
  onSaveNameChange,
  onManagerNameChange,
  onPillarsChange,
}: ManagerIdentityStepProps) => {
  const [direction, setDirection] = useState(1);
  const personalDetailsComplete = saveName.trim().length > 0;

  const goToStep = useCallback(
    (nextStep: FormStep): void => {
      if (nextStep === 2 && !personalDetailsComplete) {
        return;
      }

      setDirection(nextStep > step ? 1 : -1);
      onStepChange(nextStep);
    },
    [personalDetailsComplete, step, onStepChange],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden">
        <AnimatePresence
          mode="wait"
          custom={direction}
          initial={false}
        >
          {step === 1 ? (
            <motion.section
              key="personal-details"
              custom={direction}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="rounded-panel border border-panel-border bg-card p-6 shadow-panel"
            >
              <div>
                <div className="mb-7">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Step 1
                  </span>
                  <h2 className="mt-2 text-2xl font-bold text-text-primary">
                    Personal details
                  </h2>
                  <p className="mt-2 text-sm text-text-secondary">
                    Give your career a name and introduce the manager who will
                    lead it.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                  >
                    <Label
                      className="block"
                      htmlFor="saveName"
                    >
                      Save name
                    </Label>
                    <Input
                      id="saveName"
                      type="text"
                      className="mt-2"
                      value={saveName}
                      onChange={(event) =>
                        onSaveNameChange(event.currentTarget.value)
                      }
                      placeholder="My Career"
                      autoComplete="off"
                      autoFocus
                    />
                    <p className="mt-2 text-xs text-text-muted">
                      This is how the career will appear in your saves.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                  >
                    <Label
                      className="block"
                      htmlFor="managerName"
                    >
                      Manager name
                    </Label>
                    <Input
                      id="managerName"
                      type="text"
                      className="mt-2"
                      value={managerName}
                      onChange={(event) =>
                        onManagerNameChange(event.currentTarget.value)
                      }
                      placeholder="Your name"
                      autoComplete="name"
                    />
                    <p className="mt-2 text-xs text-text-muted">
                      Leave blank to use the save name.
                    </p>
                  </motion.div>
                </div>

              </div>
            </motion.section>
          ) : (
            <motion.section
              key="manager-identity"
              custom={direction}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="space-y-8"
            >
              <ManagerPillarsPane
                pillars={pillars}
                onPillarsChange={onPillarsChange}
              />


            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* The progress stepper stays visually on top (flex `-order-1`) but sits
          AFTER the form in document order, so tab order starts at the fields
          (level-1 a11y: inputs first, no tabindex overrides). */}
      <nav
        aria-label="Manager creation progress"
        className="-order-1"
      >
        <ol className="relative grid grid-cols-2">
          <div
            className="absolute left-[25%] right-[25%] top-5 h-px bg-border-subtle"
            aria-hidden="true"
          >
            <motion.div
              className="h-full origin-left bg-primary"
              animate={{ scaleX: step === 2 ? 1 : 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 30,
              }}
            />
          </div>

          {STEPS.map((item) => {
            const isActive = step === item.number;
            const isComplete = step > item.number;
            const isAccessible =
              item.number === 1 || personalDetailsComplete;

            return (
              <li
                key={item.number}
                className="relative flex justify-center"
              >
                <button
                  type="button"
                  className={`group flex max-w-52 flex-col items-center text-center disabled:cursor-not-allowed ${FOCUS_RING.join(" ")}`}
                  onClick={() => goToStep(item.number)}
                  disabled={!isAccessible}
                  aria-current={isActive ? "step" : undefined}
                >
                  <motion.span
                    className={`relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-bold transition-colors ${isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : isComplete
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border-subtle bg-surface text-text-muted"
                      }`}
                    animate={{
                      scale: isActive ? 1.08 : 1,
                    }}
                    whileHover={isAccessible ? { scale: 1.1 } : undefined}
                    whileTap={isAccessible ? { scale: 0.95 } : undefined}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 24,
                    }}
                  >
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={isComplete ? "complete" : item.number}
                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
                      >
                        {isComplete ? "✓" : item.number}
                      </motion.span>
                    </AnimatePresence>

                    {isActive && (
                      <motion.span
                        className="absolute inset-0 rounded-full border border-primary"
                        initial={{ opacity: 0.6, scale: 1 }}
                        animate={{ opacity: 0, scale: 1.55 }}
                        transition={{
                          duration: 1.8,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                    )}
                  </motion.span>

                  <span
                    className={`mt-3 text-sm font-semibold ${isActive || isComplete
                      ? "text-text-primary"
                      : "text-text-muted"
                      }`}
                  >
                    {item.title}
                  </span>

                  <span className="mt-1 hidden text-xs text-text-muted sm:block">
                    {item.description}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
