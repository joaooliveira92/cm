/** Injury status as CM worded it on the Selection Details strip. */
const INJURY_LABELS: Record<string, string> = {
  fit: "None",
  knock: "Carrying a knock",
  light: "Injured (light)",
  medium: "Injured (medium)",
  severe: "Injured (severe)",
};

export const injuryLabel = (status: string): string => INJURY_LABELS[status] ?? status;
