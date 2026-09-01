/**
 * PROTOTYPE — throwaway. The floating variant switcher.
 *
 * No `?variant=` search param, deliberately. The creation session
 * (`CreateFlowLayout`) is in-memory, and `/create/step-2` redirects to
 * `/create/leagues` whenever `leagueSelection` is null, so a reload can never
 * land back on this screen — a URL-encoded variant would be shareable but never
 * restorable. Switching stays in React state, which survives the only thing that
 * matters here: moving between variants without regenerating a world.
 */
import { useEffect } from "react";

export interface VariantEntry {
  readonly key: string;
  readonly name: string;
}

const isTypingTarget = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable);

export const PrototypeSwitcher = ({
  variants,
  current,
  onChange,
}: {
  readonly variants: ReadonlyArray<VariantEntry>;
  readonly current: string;
  readonly onChange: (key: string) => void;
}) => {
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (isTypingTarget(event.target)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = (index + step + variants.length) % variants.length;
      onChange(variants[next]!.key);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, onChange, variants]);

  if (!import.meta.env.DEV) return null;

  const cycle = (step: number): void => {
    const next = (index + step + variants.length) % variants.length;
    onChange(variants[next]!.key);
  };

  return (
    <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border-2 border-text-highlight bg-black/90 px-2 py-1 text-xs text-text-bright shadow-2xl">
        <button
          type="button"
          className="cursor-pointer rounded-full px-2 py-0.5 hover:bg-surface-raised"
          onClick={() => {
            cycle(-1);
          }}
        >
          ←
        </button>
        <span className="min-w-64 text-center tabular-nums">
          <span className="font-bold text-text-highlight">
            {variants[index]!.key}
          </span>{" "}
          {variants[index]!.name}
        </span>
        <button
          type="button"
          className="cursor-pointer rounded-full px-2 py-0.5 hover:bg-surface-raised"
          onClick={() => {
            cycle(1);
          }}
        >
          →
        </button>
      </div>
    </div>
  );
};
