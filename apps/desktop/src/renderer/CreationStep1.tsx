import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type {
  ManagerArchetype,
  PillarDistribution,
} from "@cm-clone/shared";
import {
  MANAGER_ARCHETYPES,
  MANAGER_ARCHETYPE_DISTRIBUTIONS,
  MANAGER_PILLARS,
  validatePillarDistribution,
} from "@cm-clone/shared";
import { Alert } from "./components/ui/alert.js";
import { Button } from "./components/ui/button.js";
import { Input } from "./components/ui/input.js";
import { Label } from "./components/ui/label.js";
import { FOCUS_RING } from "./focus.js";

export interface CreationStep1Props {
  saveName: string;
  managerName: string;
  archetype: ManagerArchetype;
  pillars: PillarDistribution;
  onSaveNameChange: (name: string) => void;
  onManagerNameChange: (name: string) => void;
  onArchetypeChange: (archetype: ManagerArchetype) => void;
  onPillarsChange: (pillars: PillarDistribution) => void;
}

type FormStep = 1 | 2;
type Pillar = (typeof MANAGER_PILLARS)[number];

const TOTAL_PILLAR_POINTS = 12;
const MIN_PILLAR_VALUE = 1;
const MAX_PILLAR_VALUE = 5;

const STEPS: ReadonlyArray<{
  number: FormStep;
  title: string;
  description: string;
}> = [
  {
    number: 1,
    title: "Personal details",
    description: "Name your career and manager",
  },
  {
    number: 2,
    title: "Manager identity",
    description: "Choose your style and strengths",
  },
];

const PILLAR_DISPLAY_NAMES: Readonly<Record<Pillar, string>> = {
  tacticalAcumen: "Tactical Acumen",
  influence: "Influence",
  regimen: "Regimen",
  technicalCoaching: "Technical Coaching",
};

const PILLAR_ACCENTS: Readonly<Record<Pillar, string>> = {
  tacticalAcumen: "from-sky-500 to-cyan-400",
  influence: "from-violet-500 to-fuchsia-400",
  regimen: "from-amber-500 to-orange-400",
  technicalCoaching: "from-emerald-500 to-teal-400",
};

const PILLAR_WARNINGS: Readonly<Record<Pillar, string>> = {
  tacticalAcumen:
    "Low tactical acumen means your tactical instructions have minimal effect on match outcomes. Your players will follow generic instructions only.",
  influence:
    "Low influence makes it harder to negotiate with selling clubs. Counter-offers will be less favorable and rejections more common.",
  regimen:
    "Low regimen means players lose condition faster between matches and recover more slowly. Squad fitness management will be challenging.",
  technicalCoaching:
    "Low technical coaching means focused player development has minimal effect. Academy players and potential gains from training focus will be minimal.",
};

const ARCHETYPE_DISPLAY_NAMES: Readonly<Record<ManagerArchetype, string>> = {
  professor: "Professor",
  motivator: "Motivator",
  sergeant: "Sergeant",
  academy_head: "Academy Head",
  custom: "Custom",
};

const ARCHETYPE_DESCRIPTIONS: Readonly<Record<ManagerArchetype, string>> = {
  professor: "A cerebral manager who reads the match before it unfolds.",
  motivator: "A magnetic leader who inspires belief and wins people over.",
  sergeant: "A relentless disciplinarian who demands peak condition.",
  academy_head: "A patient developer focused on long-term player growth.",
  custom: "Build a managerial identity around your own philosophy.",
};

const ARCHETYPE_SYMBOLS: Readonly<Record<ManagerArchetype, string>> = {
  professor: "♟",
  motivator: "✦",
  sergeant: "◆",
  academy_head: "◇",
  custom: "＋",
};

const panelVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? 48 : -48,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction > 0 ? -48 : 48,
  }),
};

const sumPillars = (pillars: PillarDistribution): number =>
  MANAGER_PILLARS.reduce((total, pillar) => total + pillars[pillar], 0);

export const CreationStep1 = ({
  saveName,
  managerName,
  archetype,
  pillars,
  onSaveNameChange,
  onManagerNameChange,
  onArchetypeChange,
  onPillarsChange,
}: CreationStep1Props) => {
  const [step, setStep] = useState<FormStep>(1);
  const [direction, setDirection] = useState(1);
  const customMode = archetype === "custom";
  const personalDetailsComplete = saveName.trim().length > 0;

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

  const goToStep = useCallback(
    (nextStep: FormStep): void => {
      if (nextStep === 2 && !personalDetailsComplete) {
        return;
      }

      setDirection(nextStep > step ? 1 : -1);
      setStep(nextStep);
    },
    [personalDetailsComplete, step],
  );

  const handleArchetypeSelect = useCallback(
    (selected: ManagerArchetype): void => {
      onArchetypeChange(selected);

      if (selected !== "custom") {
        onPillarsChange({
          ...MANAGER_ARCHETYPE_DISTRIBUTIONS[selected],
        });
      }
    },
    [onArchetypeChange, onPillarsChange],
  );

  const handlePillarChange = useCallback(
    (pillar: Pillar, delta: -1 | 1): void => {
      if (!customMode) {
        return;
      }

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
    [customMode, onPillarsChange, pillars],
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
              className="relative overflow-hidden rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />

              <div className="relative">
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

                <div className="mt-8 flex justify-end border-t border-border-subtle pt-5">
                  <Button
                    type="button"
                    onClick={() => goToStep(2)}
                    disabled={!personalDetailsComplete}
                    className="min-w-40"
                  >
                    Continue
                    <span aria-hidden="true">→</span>
                  </Button>
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
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  Step 2
                </span>
                <h2 className="mt-2 text-2xl font-bold text-text-primary">
                  Manager identity
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Choose the philosophy and strengths that define your
                  managerial career.
                </p>
              </div>

              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                role="group"
                aria-label="Manager archetype"
              >
                {MANAGER_ARCHETYPES.map((candidate, index) => {
                  const isSelected = candidate === archetype;
                  const distribution =
                    candidate === "custom"
                      ? null
                      : MANAGER_ARCHETYPE_DISTRIBUTIONS[candidate];

                  return (
                    <motion.div
                      key={candidate}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 320,
                        damping: 26,
                      }}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className="relative"
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="selected-archetype"
                          className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary via-primary/40 to-transparent"
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 32,
                          }}
                        />
                      )}

                      <Button
                        type="button"
                        variant="secondary"
                        aria-pressed={isSelected}
                        className={`relative h-full min-h-44 w-full flex-col items-start justify-between rounded-2xl border p-4 text-left ${
                          isSelected
                            ? "border-transparent bg-surface-raised"
                            : "border-border-subtle bg-surface hover:border-primary/30"
                        }`}
                        onClick={() => handleArchetypeSelect(candidate)}
                      >
                        <div className="flex w-full items-start justify-between">
                          <motion.span
                            className={`flex size-11 items-center justify-center rounded-xl text-xl ${
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                                : "bg-background text-text-secondary"
                            }`}
                            animate={
                              isSelected
                                ? {
                                    rotate: [0, -5, 5, 0],
                                    scale: [1, 1.08, 1],
                                  }
                                : undefined
                            }
                          >
                            {ARCHETYPE_SYMBOLS[candidate]}
                          </motion.span>

                          <AnimatePresence>
                            {isSelected && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary"
                              >
                                Selected
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="mt-5">
                          <span className="block font-semibold">
                            {ARCHETYPE_DISPLAY_NAMES[candidate]}
                          </span>
                          <span className="mt-1 block text-xs font-normal leading-relaxed text-text-secondary">
                            {ARCHETYPE_DESCRIPTIONS[candidate]}
                          </span>
                        </div>

                        {distribution !== null && (
                          <div className="mt-4 flex w-full gap-1.5">
                            {MANAGER_PILLARS.map((pillar) => (
                              <div
                                key={pillar}
                                className="h-1.5 flex-1 overflow-hidden rounded-full bg-background"
                                title={`${PILLAR_DISPLAY_NAMES[pillar]}: ${distribution[pillar]}`}
                              >
                                <motion.div
                                  className={`h-full rounded-full bg-gradient-to-r ${PILLAR_ACCENTS[pillar]}`}
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${(distribution[pillar] / MAX_PILLAR_VALUE) * 100}%`,
                                  }}
                                  transition={{
                                    delay: 0.18 + index * 0.04,
                                    duration: 0.4,
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
                <div className="flex flex-col gap-4 border-b border-border-subtle p-5 sm:flex-row sm:items-center sm:justify-between">
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
                    className={`rounded-xl border px-4 py-2 text-center ${
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
                          className={`block text-lg font-bold tabular-nums ${
                            pointsRemaining === 0
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

                <div className="grid gap-px bg-border-subtle md:grid-cols-2">
                  {MANAGER_PILLARS.map((pillar) => {
                    const value = pillars[pillar];
                    const isMinimum = value === MIN_PILLAR_VALUE;

                    return (
                      <div
                        key={pillar}
                        className="bg-surface p-5"
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
                              !customMode || value <= MIN_PILLAR_VALUE
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
                                  className={`inline-block text-lg font-bold tabular-nums ${
                                    isMinimum
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
                                      className={`h-2 flex-1 rounded-full ${
                                        active
                                          ? `bg-gradient-to-r ${PILLAR_ACCENTS[pillar]}`
                                          : "bg-background"
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
                              !customMode || value >= MAX_PILLAR_VALUE
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
                {customMode && pillarErrors.length > 0 && (
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
                {customMode && lowPillars.length > 0 && (
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

              <div className="flex justify-start border-t border-border-subtle pt-5">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => goToStep(1)}
                >
                  <span aria-hidden="true">←</span>
                  Back to personal details
                </Button>
              </div>
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
                    className={`relative z-10 flex size-10 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
                      isActive
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
                    className={`mt-3 text-sm font-semibold ${
                      isActive || isComplete
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