import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { NationId } from "@cm-clone/contracts";
import { NATION_CODES, NATION_PROFILES, canonicalNationId } from "@cm-clone/shared";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { useCreateSessionApi } from "../router/createSessionContext.js";
import { CreationStepper } from "./CreationStepper.js";
import { DateOfBirthField } from "./DateOfBirthField.js";
import { FavoriteTeamField } from "./FavoriteTeamField.js";
import { ManagerPillarsPane } from "./ManagerPillarsPane.js";
import { panelVariants } from "./managerIdentityCopy.js";
import { selectedFavoriteTeamOf } from "./favoriteTeam.js";
import { provisionalIdOf } from "./generation.js";
import { personalDetailsComplete } from "./personalDetails.js";

/** The world's nations, which generation copies into every save, so the picker never has to wait
 *  on the world to offer an answer. Names are factual geography read from code, not a content pack. */
const NATIONALITIES = NATION_CODES.map((code) => ({
  id: canonicalNationId(code),
  name: NATION_PROFILES[code].displayName,
}));

export const ManagerIdentityStep = () => {
  const { session, update, setManagerStep, selectFavoriteTeam } = useCreateSessionApi();
  const [direction, setDirection] = useState(1);
  const {
    saveName,
    firstName,
    lastName,
    nationalityId,
    dateOfBirth,
    pillars,
    managerStep: step,
  } = session;

  const detailsComplete = personalDetailsComplete(session);
  const provisionalId = provisionalIdOf(session.generation);
  const favoriteTeam = selectedFavoriteTeamOf(session);

  const goToStep = useCallback(
    (nextStep: 1 | 2) => {
      if (nextStep === 2 && !detailsComplete) return;
      setDirection(nextStep > step ? 1 : -1);
      setManagerStep(nextStep);
    },
    [detailsComplete, step, setManagerStep],
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
                    className="md:col-span-2"
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
                    <Label className="block">Nationality</Label>
                    <Select
                      value={nationalityId ?? ""}
                      onValueChange={(value) =>
                        update({
                          nationalityId:
                            value === "" || value === null ? null : NationId.make(value),
                        })
                      }
                    >
                      <SelectTrigger aria-label="Nationality" className="mt-2">
                        <SelectValue>
                          {(value: string | null) =>
                            NATIONALITIES.find((nation) => nation.id === value)?.name ??
                            "Select a nationality"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {NATIONALITIES.map((nation) => (
                          <SelectItem key={nation.id} value={nation.id}>
                            {nation.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
            canAdvance={detailsComplete}
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
