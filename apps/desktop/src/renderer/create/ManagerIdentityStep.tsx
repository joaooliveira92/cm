import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { useCreateSessionApi } from "../router/createSessionContext.js";
import { CreationStepper } from "./CreationStepper.js";
import { DateOfBirthField } from "./DateOfBirthField.js";
import { FavoriteTeamField } from "./FavoriteTeamField.js";
import { NationalityField } from "./NationalityField.js";
import { ManagerPillarsPane } from "./ManagerPillarsPane.js";
import { ManagerStyleAppearancePane } from "./ManagerStyleAppearancePane.js";
import { StepHeading } from "./StepHeading.js";
import { panelVariants, sumPillars, type FormStep } from "./managerIdentityCopy.js";
import { selectedFavoriteTeamOf } from "./favoriteTeam.js";
import { provisionalIdOf } from "./generation.js";
import { personalDetailsComplete } from "./personalDetails.js";

export const ManagerIdentityStep = () => {
  const { session, update, setManagerStep, selectFavoriteTeam } = useCreateSessionApi();
  const [direction, setDirection] = useState(1);
  const {
    firstName,
    lastName,
    nationalityId,
    dateOfBirth,
    pillars,
    preferredFormation,
    preferredStyleId,
    avatarPrimaryColor,
    avatarSecondaryColor,
    managerStep: step,
  } = session;

  const detailsComplete = personalDetailsComplete(session);
  const pillarsComplete = sumPillars(pillars) === 12;
  const provisionalId = provisionalIdOf(session.generation);
  const favoriteTeam = selectedFavoriteTeamOf(session);

  const canReachStep = useCallback(
    (next: FormStep): boolean => {
      if (next === 1) return true;
      if (next === 2) return detailsComplete;
      return detailsComplete && pillarsComplete;
    },
    [detailsComplete, pillarsComplete],
  );

  const goToStep = useCallback(
    (nextStep: FormStep) => {
      if (!canReachStep(nextStep)) return;
      setDirection(nextStep > step ? 1 : -1);
      setManagerStep(nextStep);
    },
    [canReachStep, step, setManagerStep],
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
                  <StepHeading title="Personal details">
                    Introduce the manager who will lead this career.
                  </StepHeading>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.14 }}
                  >
                    <Label className="block" htmlFor="firstName">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      className="mt-2"
                      value={firstName}
                      onChange={(event) =>
                        update({ firstName: event.currentTarget.value })
                      }
                      placeholder="Your first name"
                      autoComplete="given-name"
                      autoFocus
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    <Label className="block" htmlFor="lastName">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      className="mt-2"
                      value={lastName}
                      onChange={(event) =>
                        update({ lastName: event.currentTarget.value })
                      }
                      placeholder="Your last name"
                      autoComplete="family-name"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.22 }}
                  >
                    <NationalityField
                      value={nationalityId}
                      onSelect={(id) => update({ nationalityId: id })}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.26 }}
                  >
                    <DateOfBirthField
                      value={dateOfBirth}
                      onChange={(isoDate) => update({ dateOfBirth: isoDate })}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="md:col-span-2"
                  >
                    <FavoriteTeamField
                      saveId={provisionalId}
                      value={favoriteTeam}
                      onSelect={selectFavoriteTeam}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.section>
          ) : step === 2 ? (
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
          ) : (
            <motion.section
              key="manager-style"
              custom={direction}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="space-y-8"
            >
              <ManagerStyleAppearancePane
                preferredFormation={preferredFormation}
                preferredStyleId={preferredStyleId}
                avatarPrimaryColor={avatarPrimaryColor}
                avatarSecondaryColor={avatarSecondaryColor}
                onFormationChange={(formation) => update({ preferredFormation: formation })}
                onStyleChange={(style) => update({ preferredStyleId: style })}
                onAvatarChange={(primary, secondary) =>
                  update({ avatarPrimaryColor: primary, avatarSecondaryColor: secondary })
                }
              />
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <nav
        aria-label="Manager creation progress"
        className="-order-1"
      >
        <ol className="relative grid grid-cols-3">
          <CreationStepper.Root
            step={step}
            canReach={canReachStep}
            goToStep={goToStep}
            direction={direction}
            setDirection={setDirection}
          >
            <CreationStepper.Connector />
            <CreationStepper.StepButton number={1} />
            <CreationStepper.StepButton number={2} />
            <CreationStepper.StepButton number={3} />
          </CreationStepper.Root>
        </ol>
      </nav>
    </div>
  );
};
