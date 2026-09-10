import { createContext, use, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FOCUS_RING } from "../focus.js";
import { STEPS, panelVariants, type FormStep } from "./managerIdentityCopy.js";

interface StepperValue {
  readonly step: FormStep;
  readonly goToStep: (next: FormStep) => void;
  readonly canAdvance: boolean;
  readonly direction: number;
  readonly setDirection: (dir: number) => void;
}

const StepperContext = createContext<StepperValue | null>(null);

const useStepper = () => {
  const ctx = use(StepperContext);
  if (ctx === null) {
    throw new Error("CreationStepper.* must be inside CreationStepper.Root");
  }
  return ctx;
};

const CreationStepperRoot = ({
  step,
  goToStep,
  canAdvance,
  direction,
  setDirection,
  children,
}: {
  readonly step: FormStep;
  readonly goToStep: (next: FormStep) => void;
  readonly canAdvance: boolean;
  readonly direction: number;
  readonly setDirection: (dir: number) => void;
  readonly children: React.ReactNode;
}) => (
  <StepperContext value={{ step, goToStep, canAdvance, direction, setDirection }}>
    {children}
  </StepperContext>
);

const CreationStepperConnector = () => {
  const { step } = useStepper();

  return (
    <div
      className="absolute left-[25%] right-[25%] top-5 h-px bg-border-subtle"
      aria-hidden="true"
    >
      <motion.div
        className="h-full origin-left bg-primary"
        animate={{ scaleX: step === 2 ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
      />
    </div>
  );
};

const CreationStepperStepButton = ({ number }: { readonly number: FormStep }) => {
  const { step, canAdvance, goToStep, setDirection } = useStepper();
  const isActive = step === number;
  const isComplete = step > number;
  const isAccessible = number === 1 || canAdvance;
  const item = STEPS.find((s) => s.number === number);
  if (item === undefined) return null;

  const handleClick = useCallback(() => {
    const nextDir = number > step ? 1 : -1;
    setDirection(nextDir);
    goToStep(number);
  }, [number, step, goToStep, setDirection]);

  return (
    <li className="relative flex justify-center">
      <button
        type="button"
        className={`group flex max-w-52 flex-col items-center text-center disabled:cursor-not-allowed ${FOCUS_RING.join(" ")}`}
        onClick={handleClick}
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
          animate={{ scale: isActive ? 1.08 : 1 }}
          whileHover={isAccessible ? { scale: 1.1 } : undefined}
          whileTap={isAccessible ? { scale: 0.95 } : undefined}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={isComplete ? "complete" : number}
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
            >
              {isComplete ? "✓" : number}
            </motion.span>
          </AnimatePresence>

          {isActive && (
            <motion.span
              className="absolute inset-0 rounded-full border border-primary"
              initial={{ opacity: 0.6, scale: 1 }}
              animate={{ opacity: 0, scale: 1.55 }}
              transition={{ duration: 1.8, repeat: Number.POSITIVE_INFINITY }}
            />
          )}
        </motion.span>

        <span
          className={`mt-3 text-sm font-semibold ${
            isActive || isComplete ? "text-text-primary" : "text-text-muted"
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
};

export const CreationStepper = {
  Root: CreationStepperRoot,
  Connector: CreationStepperConnector,
  StepButton: CreationStepperStepButton,
};