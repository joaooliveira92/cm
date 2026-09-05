/**
 * Static presentation vocabulary for the manager-creation step: the two-step
 * stepper copy, the pillar display names, accents and low-value warnings, the
 * point budget, and the panel transition variants. Copy, not logic — the
 * warning strings are player-facing text and are held verbatim.
 */
import type { PillarDistribution } from "@cm-clone/shared";
import { MANAGER_PILLARS } from "@cm-clone/shared";
import type { ManagerSubStep } from "../router/createSessionContext.js";

export type FormStep = ManagerSubStep;
export type Pillar = (typeof MANAGER_PILLARS)[number];

export const TOTAL_PILLAR_POINTS = 12;
export const MIN_PILLAR_VALUE = 1;
export const MAX_PILLAR_VALUE = 5;

export const STEPS: ReadonlyArray<{
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
      description: "Allocate your manager's strengths",
    },
  ];

export const PILLAR_DISPLAY_NAMES: Readonly<Record<Pillar, string>> = {
  tacticalAcumen: "Tactical Acumen",
  influence: "Influence",
  regimen: "Regimen",
  technicalCoaching: "Technical Coaching",
};

/** One restrained accent for every pillar — the same primary the Active Leagues workspace uses
 *  for its chrome — so the step reads as a calm panel rather than a burst of disjoint colours. */
export const PILLAR_ACCENTS: Readonly<Record<Pillar, string>> = {
  tacticalAcumen: "bg-primary",
  influence: "bg-primary",
  regimen: "bg-primary",
  technicalCoaching: "bg-primary",
};

export const PILLAR_WARNINGS: Readonly<Record<Pillar, string>> = {
  tacticalAcumen:
    "Low tactical acumen means your tactical instructions have minimal effect on match outcomes. Your players will follow generic instructions only.",
  influence:
    "Low influence makes it harder to negotiate with selling clubs. Counter-offers will be less favorable and rejections more common.",
  regimen:
    "Low regimen means players lose condition faster between matches and recover more slowly. Squad fitness management will be challenging.",
  technicalCoaching:
    "Low technical coaching means focused player development has minimal effect. Academy players and potential gains from training focus will be minimal.",
};

export const panelVariants = {
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

export const sumPillars = (pillars: PillarDistribution): number =>
  MANAGER_PILLARS.reduce((total, pillar) => total + pillars[pillar], 0);
