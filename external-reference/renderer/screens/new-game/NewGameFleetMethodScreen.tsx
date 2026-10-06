import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import type { SetPrimaryAction } from "../../shell/primary-action.js";
import { ScreenHeader } from "./components/ScreenHeader.js";
import { FLEET_METHOD_CARDS, type FleetMethodCardContent } from "./fleet-method-content.js";
import type { FleetMethodDraft } from "./new-game-fleet-method-screen-state.js";

export interface NewGameFleetMethodScreenProps {
  readonly initialFleetMethod: FleetMethodDraft;
  readonly status: "ready" | "launching";
  readonly error: string | null;
  readonly onBack: () => void;
  readonly onNext: (fleetMethod: FleetMethodDraft) => void;
  readonly onPrimaryActionChange: SetPrimaryAction;
}

export function NewGameFleetMethodScreen({
  initialFleetMethod,
  status,
  error,
  onBack,
  onNext,
  onPrimaryActionChange,
}: NewGameFleetMethodScreenProps) {
  const [fleetMethod, setFleetMethod] = useState<FleetMethodDraft>(initialFleetMethod);
  const launching = status === "launching";

  const fleetMethodRef = useRef(fleetMethod);
  fleetMethodRef.current = fleetMethod;
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;

  const triggerNext = useCallback(() => {
    onNextRef.current(fleetMethodRef.current);
  }, []);

  useEffect(() => {
    onPrimaryActionChange({
      label: launching ? "Starting…" : "Start Campaign",
      disabled: launching,
      onTrigger: triggerNext,
    });
    return () => onPrimaryActionChange(null);
  }, [launching, triggerNext, onPrimaryActionChange]);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6 overflow-y-auto p-8">
      <ScreenHeader
        icon={<span>⚓</span>}
        title="Starting-fleet method"
        description="Choose how your legacy navy comes together. Every option is available in every era."
      />

      {error !== null && <p className="text-sm text-destructive">{error}</p>}

      <section aria-label="Starting-fleet method choices">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FLEET_METHOD_CARDS.map((card) => (
            <FleetMethodCard
              key={card.id}
              card={card}
              active={fleetMethod.legacyFleetModeId === card.id}
              onSelect={() => setFleetMethod({ legacyFleetModeId: card.id })}
            />
          ))}
        </div>
      </section>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack} disabled={launching}>
          Back to Identity
        </Button>
      </div>
    </div>
  );
}

function FleetMethodCard({
  card,
  active,
  onSelect,
}: {
  card: FleetMethodCardContent;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{card.title}</span>
        <Badge variant="secondary">{card.tagline}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{card.description}</p>
      {card.note !== null && <p className="text-xs italic text-muted-foreground">{card.note}</p>}
    </button>
  );
}
