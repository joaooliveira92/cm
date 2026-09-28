/**
 * The bottom bar's ambient status line (`BottomBarPlan.status`), scrolled past
 * one item at a time.
 *
 * Two identical copies sit side by side and the track slides left by exactly
 * one copy per cycle (`bottom-bar-marquee` in `index.css`), so the loop has no
 * seam. Each item trails a gap the width of the viewport (`100cqw`), so one has
 * fully left before the next enters: only ever one item on screen.
 */
import { type RefObject, useEffect, useRef, useState } from "react";

/** Travel speed, held constant: a fixed cycle time would scroll faster on a
 *  wider window, since the viewport-wide gaps are part of what a cycle covers. */
export const MARQUEE_PX_PER_SECOND = 40;

/** Until the copy has been measured (or where it cannot be), a cycle takes this. */
const FALLBACK_SECONDS = 60;

export interface StatusMarqueeProps {
  readonly items: readonly string[];
  /** The accessible name of the list. */
  readonly label?: string;
}

export const StatusMarquee = ({ items, label = "Status" }: StatusMarqueeProps) => {
  const copyRef = useRef<HTMLUListElement>(null);
  const duration = useCycleSeconds(copyRef);

  return (
    <div
      // Hovering pauses the scroll (WCAG 2.2.2), and the tooltip gives the whole
      // line at once to anyone who stopped it to read.
      title={items.join("\n")}
      className="@container min-w-0 flex-1 overflow-hidden text-xs text-text-muted motion-safe:[mask-image:linear-gradient(to_right,transparent,#000_1rem,#000_calc(100%-1rem),transparent)]"
    >
      <div
        data-marquee-track=""
        style={{ animationDuration: `${duration}s` }}
        className="flex w-max animate-[bottom-bar-marquee_60s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none"
      >
        {/* The second copy exists only to close the loop: it is hidden from
            assistive tech, and reduced motion drops it and lays the one copy out
            as a still, clipped row, so every item stays reachable. */}
        {[false, true].map((duplicate) => (
          <ul
            key={String(duplicate)}
            ref={duplicate ? undefined : copyRef}
            aria-label={duplicate ? undefined : label}
            aria-hidden={duplicate || undefined}
            className={`flex shrink-0 motion-reduce:min-w-0 motion-reduce:shrink motion-reduce:gap-6 ${duplicate ? "motion-reduce:hidden" : ""}`}
          >
            {items.map((item, index) => (
              // Position is the identity here: the list is a fixed line, never
              // reordered, and two items may share their text.
              <li key={index} className="shrink-0 pr-[100cqw] whitespace-nowrap motion-reduce:pr-0">
                {item}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
};

/**
 * Seconds per cycle for a constant speed, re-derived whenever the copy's width
 * changes: a new item, or a window resize (the trailing gaps are `100cqw`).
 */
function useCycleSeconds(copyRef: RefObject<HTMLUListElement | null>): number {
  const [seconds, setSeconds] = useState(FALLBACK_SECONDS);

  useEffect(() => {
    const copy = copyRef.current;
    if (copy === null || typeof ResizeObserver === "undefined") return;

    const measure = (): void => {
      const width = copy.getBoundingClientRect().width;
      // A zero width means the bar is not laid out yet (or is hidden); keep the
      // last good value rather than a zero-length cycle.
      if (width <= 0) return;
      // Tenths of a second: resize storms settle on one value instead of
      // re-rendering the bar for every sub-pixel.
      setSeconds(Math.round((width / MARQUEE_PX_PER_SECOND) * 10) / 10);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [copyRef]);

  return seconds;
}
