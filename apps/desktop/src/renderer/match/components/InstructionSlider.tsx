import { useRef } from "react";
import { Button } from "../../components/ui/button.js";
import { spaced } from "../../tactics/overviewFormat.js";

export interface InstructionSliderOptions<T extends string> {
  readonly label: string;
  readonly options: ReadonlyArray<T>;
  readonly value: T;
  readonly onChange: (value: T) => void;
  readonly actionId: string;
}

export const InstructionSlider = <T extends string>({
  label,
  options,
  value,
  onChange,
  actionId,
}: InstructionSliderOptions<T>) => {
  const groupRef = useRef<HTMLDivElement | null>(null);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = options.indexOf(value);
    if (index < 0) return;
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + delta + options.length) % options.length;
    onChange(options[nextIndex]!);
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-action-id]",
    );
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div ref={groupRef} role="group" aria-label={label} onKeyDown={onKeyDown}>
      <p className="text-data text-text-secondary">{label}</p>
      <div className="mt-1 flex gap-1">
        {options.map((option) => (
          <Button
            key={option}
            type="button"
            variant={option === value ? "default" : "secondary"}
            size="sm"
            data-action-id={actionId}
            tabIndex={option === value ? 0 : -1}
            aria-pressed={option === value}
            onClick={() => onChange(option)}
          >
            {spaced(option)}
          </Button>
        ))}
      </div>
    </div>
  );
};