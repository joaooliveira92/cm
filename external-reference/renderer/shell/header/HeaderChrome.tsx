import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "../../components/ui/button.js";
import type { Theme } from "../ThemeContext.js";
import { useTheme } from "../ThemeContext.js";

const THEME_SEQUENCE: readonly Theme[] = ["light", "dark", "system"];
const THEME_ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function HeaderChrome() {
  const { theme, setTheme } = useTheme();
  const Icon = THEME_ICONS[theme];

  const cycleTheme = () => {
    const index = THEME_SEQUENCE.indexOf(theme);
    const next = THEME_SEQUENCE[(index + 1) % THEME_SEQUENCE.length];
    if (next === undefined) return;
    setTheme(next);
  };

  return (
    <Button
      className="h-8 w-8 shrink-0"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${theme}. Click to change.`}
      title={`Theme: ${theme}`}
      onClick={cycleTheme}
    >
      <Icon />
    </Button>
  );
}
