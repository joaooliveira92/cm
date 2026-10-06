import type { PlayerProjection } from "@bluewave/campaign-engine";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDate(month: PlayerProjection["month"]): string {
  return `${MONTH_NAMES[month.month - 1] ?? month.month} ${month.year}`;
}
