export function formatMinutes(minutes: number[]): string {
  return minutes.map(String).join(", ");
}

export function formatStoppageTime(stoppageTime: number[]): string {
  return stoppageTime.map(n => `+${n}`).join(", ");
}

export function formatPeriodScores(periodScores: {
  halfTime?: { home: number; away: number };
  fullTime?: { home: number; away: number };
  extraTime?: { home: number; away: number };
}): string {
  const parts: string[] = [];
  if (periodScores.halfTime) {
    parts.push(`HT ${periodScores.halfTime.home}-${periodScores.halfTime.away}`);
  }
  if (periodScores.fullTime) {
    parts.push(`FT ${periodScores.fullTime.home}-${periodScores.fullTime.away}`);
  }
  if (periodScores.extraTime) {
    parts.push(`ET ${periodScores.extraTime.home}-${periodScores.extraTime.away}`);
  }
  return parts.join(" / ");
}

export function formatSummary(periodScores: {
  halfTime?: { home: number; away: number };
  fullTime?: { home: number; away: number };
  extraTime?: { home: number; away: number };
  penalties?: { home: number; away: number };
}): string {
  const parts: string[] = [];
  if (periodScores.halfTime) {
    parts.push(`HT ${periodScores.halfTime.home}-${periodScores.halfTime.away}`);
  }
  if (periodScores.fullTime) {
    parts.push(`FT ${periodScores.fullTime.home}-${periodScores.fullTime.away}`);
  }
  if (periodScores.extraTime) {
    parts.push(`ET ${periodScores.extraTime.home}-${periodScores.extraTime.away}`);
  }
  if (periodScores.penalties) {
    parts.push(`PK ${periodScores.penalties.home}-${periodScores.penalties.away}`);
  }
  return parts.join(" ");
}

export function getInjurySummary(incidents: Array<{ type: string; displayText?: string }>): string | undefined {
  const injury = incidents.find(i => i.type === "injury");
  return injury?.displayText;
}

export function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? "th"
      : n % 10 === 1
      ? "st"
      : n % 10 === 2
      ? "nd"
      : n % 10 === 3
      ? "rd"
      : "th";
  return `${n}${suffix}`;
}

export function formatDateLong(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayName = days[date.getDay()];
  const month = months[date.getMonth()];
  const day = ordinal(date.getDate());
  const year = date.getFullYear();

  return `${dayName} ${day} ${month} ${year}`;
}

export function formatWeather(weather: { condition: string; temperatureCelsius: number }): string {
  const conditionLabel = weather.condition.charAt(0).toUpperCase() + weather.condition.slice(1);
  return `${conditionLabel} ${weather.temperatureCelsius}°C`;
}

export function formatAttendance(n: number): string {
  return String(n);
}

export function normalizePossession(home: number, away: number): { home: number; away: number } {
  const total = home + away;
  if (total === 0) return { home: 50, away: 50 };
  const scale = 100 / total;
  return { home: Math.round(home * scale), away: 100 - Math.round(home * scale) };
}

export function getTeamForegroundColor(theme: { primary: string; foreground: string }): string {
  return theme.foreground;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}