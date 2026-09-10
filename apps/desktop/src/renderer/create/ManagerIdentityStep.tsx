import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { FOCUS_RING } from "../focus.js";
import { useCreateSessionApi } from "../router/createSessionContext.js";
import { CreationStepper } from "./CreationStepper.js";
import { ManagerPillarsPane } from "./ManagerPillarsPane.js";
import { panelVariants } from "./managerIdentityCopy.js";

export const ManagerIdentityStep = () => {
  const { session, update, setManagerStep } = useCreateSessionApi();
  const [direction, setDirection] = useState(1);
  const { saveName, managerName, pillars, managerStep: step } = session;

  const personalDetailsComplete = saveName.trim().length > 0;

  const goToStep = useCallback(
    (nextStep: 1 | 2) => {
      if (nextStep === 2 && !personalDetailsComplete) return;
      setDirection(nextStep > step ? 1 : -1);
      setManagerStep(nextStep);
    },
    [personalDetailsComplete, step, setManagerStep],
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {step === 1 ? (
            <motion.section
              key="personal-details"
              custom={direction}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                    Give your career a name and introduce the manager who will lead it.
                  </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 }}
                  >
                    <Label className="block" htmlFor="saveName">
                      Save name
                    </Label>
                    <Input
                      id="saveName"
                      type="text"
                      className="mt-2"
                      value={saveName}
                      onChange={(event) =>
                        update({ saveName: event.currentTarget.value })
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
                    <Label className="block" htmlFor="managerName">
                      Manager name
                    </Label>
                    <Input
                      id="managerName"
                      type="text"
                      className="mt-2"
                      value={managerName}
                      onChange={(event) =>
                        update({ managerName: event.currentTarget.value })
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
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <ManagerPillarsPane
                pillars={pillars}
                onPillarsChange={(next) => update({ pillars: next })}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <nav
        aria-label="Manager creation progress"
        className="-order-1"
      >
        <ol className="relative grid grid-cols-2">
          <CreationStepper.Root
            step={step}
            canAdvance={personalDetailsComplete}
            goToStep={goToStep}
            direction={direction}
            setDirection={setDirection}
          >
            <CreationStepper.Connector />
            <CreationStepper.StepButton number={1} />
            <CreationStepper.StepButton number={2} />
          </CreationStepper.Root>
        </ol>
      </nav>
    </div>
  );
};