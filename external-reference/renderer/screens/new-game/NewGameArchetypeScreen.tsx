import {
  ARCHETYPE_DIMENSION_MAX,
  ARCHETYPE_DIMENSION_MIN,
  ARCHETYPE_POINT_TOTAL,
  ARCHETYPE_PRESETS,
  type ArchetypeAllocation,
  type ArchetypeDimension,
  type ArchetypeSelection,
  type ArchetypePreset,
} from "@bluewave/campaign-engine";
import { Coins, Factory, Gauge, Minus, Plus, RotateCcw, Swords, Wand2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog.js";
import { Progress } from "../../components/ui/progress.js";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover.js";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip.js";
import type { SetPrimaryAction } from "../../shell/primary-action.js";
import { buildArchetypeConsequence } from "./archetype-consequence.js";
import { ArchetypeConsequencePanel } from "./ArchetypeConsequencePanel.js";
import {
  type ArchetypeEditorState,
  allocationErrors,
  createCustomArchetype,
  editorToSelection,
  isAllocationValid,
  resetCustomAllocation,
  restoreArchetypeEditorState,
  selectPreset,
  setDimension,
  usedPoints,
} from "./new-game-archetype-screen-state.js";

const DIMENSION_STYLE: Record<
  ArchetypeDimension,
  { readonly icon: typeof Coins; readonly accent: string }
> = {
  economy: { icon: Coins, accent: "text-sky-500" },
  industry: { icon: Factory, accent: "text-amber-500" },
  combat: { icon: Swords, accent: "text-rose-500" },
};

const DIMENSION_META: readonly {
  readonly dimension: ArchetypeDimension;
  readonly label: string;
  readonly hint: string;
}[] = [
  {
    dimension: "economy",
    label: "Economy",
    hint: "Starting treasury and monthly appropriation",
  },
  { dimension: "industry", label: "Industry", hint: "Shipyard capacity" },
  { dimension: "combat", label: "Combat", hint: "Battle power" },
];

export interface NewGameArchetypeScreenProps {
  readonly initialArchetype: ArchetypeSelection | null;
  readonly onBack: () => void;
  readonly onNext: (selection: ArchetypeSelection) => void;
  readonly onPrimaryActionChange: SetPrimaryAction;
}

export function NewGameArchetypeScreen({
  initialArchetype,
  onBack,
  onNext,
  onPrimaryActionChange,
}: NewGameArchetypeScreenProps) {
  const [state, setState] = useState<ArchetypeEditorState>(() =>
    restoreArchetypeEditorState(initialArchetype),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ArchetypeEditorState>(() => createCustomArchetype());

  const consequence = useMemo(
    () => buildArchetypeConsequence(state.allocation),
    [state.allocation],
  );
  const draftConsequence = useMemo(
    () => buildArchetypeConsequence(draft.allocation),
    [draft.allocation],
  );

  const hasSelection = state.mode === "preset" ? state.selectedPresetId !== null : true;

  const stateRef = useRef(state);
  const onNextRef = useRef(onNext);

  stateRef.current = state;
  onNextRef.current = onNext;

  const handleChooseNation = useCallback(() => {
    const currentState = stateRef.current;
    if (!isAllocationValid(currentState)) return;
    onNextRef.current(editorToSelection(currentState));
  }, []);

  useEffect(() => {
    onPrimaryActionChange({
      label: "Choose Nation",
      disabled: !hasSelection,
      onTrigger: handleChooseNation,
    });

    return () => {
      onPrimaryActionChange(null);
    };
  }, [hasSelection, handleChooseNation, onPrimaryActionChange]);

  const handlePresetClick = useCallback((id: string) => {
    setState((current) => selectPreset(current, id));
  }, []);

  const openCustomEditor = useCallback(() => {
    setDraft(
      state.mode === "custom"
        ? {
            mode: "custom",
            selectedPresetId: null,
            allocation: { ...state.allocation },
          }
        : createCustomArchetype(),
    );
    setModalOpen(true);
  }, [state.mode, state.allocation]);

  const commitCustom = useCallback(() => {
    setState({
      mode: "custom",
      selectedPresetId: null,
      allocation: { ...draft.allocation },
    });
    setModalOpen(false);
  }, [draft.allocation]);

  const handleReset = useCallback(() => {
    setDraft((current) => resetCustomAllocation(current));
  }, []);

  const draftValid = isAllocationValid(draft);

  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 overflow-y-auto p-8">
      <header>
        <h2 className="text-2xl font-semibold">Choose your archetype</h2>
        <p className="text-sm text-muted-foreground">
          Pick a playstyle, or build your own with 20 points across three engine-backed attributes.
        </p>
      </header>

      <section aria-label="Archetype choices">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ARCHETYPE_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              active={state.mode === "preset" && state.selectedPresetId === preset.id}
              onSelect={() => handlePresetClick(preset.id)}
            />
          ))}
          <CreateCard
            selected={state.mode === "custom"}
            allocation={state.mode === "custom" ? state.allocation : null}
            onSelect={openCustomEditor}
          />
        </div>
      </section>

      <section aria-label="Consequence preview" className="min-h-0 flex-1 content-start">
        {hasSelection ? <ArchetypeConsequencePanel consequence={consequence} /> : <EmptyPreview />}
      </section>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to Preferences
        </Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-y-auto pb-0">
          <DialogHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                <Wand2 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1.5">
                <DialogTitle>Create your own archetype</DialogTitle>
                <DialogDescription>
                  Distribute exactly 20 points across economy, industry, and combat.
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <AllocationEditor draft={draft} onDraftChange={setDraft} />
            </div>

            <div className="min-w-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Live preview
              </p>
              <ArchetypeConsequencePanel consequence={draftConsequence} compact />
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 -mx-6 -mb-6 flex-row border-t bg-background px-6 py-4 sm:justify-end sm:space-x-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={commitCustom} disabled={!draftValid}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PresetCard({
  preset,
  active,
  onSelect,
}: {
  preset: ArchetypePreset;
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
      <div className="flex items-center justify-between">
        <span className="font-semibold">{preset.name}</span>
        <Badge variant="secondary">{preset.tagline}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{preset.description}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        {preset.allocation.economy} / {preset.allocation.industry} / {preset.allocation.combat}
      </p>
    </button>
  );
}

function CreateCard({
  selected,
  allocation,
  onSelect,
}: {
  selected: boolean;
  allocation: ArchetypeAllocation | null;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <Plus className="h-6 w-6 text-muted-foreground" />
      <span className="font-semibold">Create Your Own</span>
      {allocation !== null ? (
        <span className="text-xs tabular-nums text-muted-foreground">
          {allocation.economy} / {allocation.industry} / {allocation.combat}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">Build a custom split</span>
      )}
    </button>
  );
}

function AllocationEditor({
  draft,
  onDraftChange,
}: {
  draft: ArchetypeEditorState;
  onDraftChange: React.Dispatch<React.SetStateAction<ArchetypeEditorState>>;
}) {
  const points = usedPoints(draft);
  const errors = allocationErrors(draft);

  return (
    <div className="space-y-4">
      <TooltipProvider>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <Tooltip>
            <TooltipTrigger
              render={<span className="flex items-center gap-2 text-sm text-muted-foreground" />}
            >
              <Gauge className="h-4 w-4" />
              Points
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Each dimension is between {ARCHETYPE_DIMENSION_MIN} and {ARCHETYPE_DIMENSION_MAX}; the
              total must equal {ARCHETYPE_POINT_TOTAL}.
            </TooltipContent>
          </Tooltip>
          {errors.length > 0 ? (
            <Popover>
              <PopoverTrigger render={<span className="inline-flex" />} nativeButton={false}>
                <Badge variant="destructive" className="cursor-pointer tabular-nums">
                  {points} / {ARCHETYPE_POINT_TOTAL}
                </Badge>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Allocation needs fixing</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Badge variant="secondary" className="tabular-nums">
              {points} / {ARCHETYPE_POINT_TOTAL}
            </Badge>
          )}
        </div>
      </TooltipProvider>

      <div className="grid grid-cols-1 gap-2 rounded-lg border p-2">
        <div className="flex items-center justify-between px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Budget used</span>
          <span className="tabular-nums">
            {points} / {ARCHETYPE_POINT_TOTAL}
          </span>
        </div>
        <Progress value={(points / ARCHETYPE_POINT_TOTAL) * 100} />
      </div>

      <div className="space-y-2">
        {DIMENSION_META.map(({ dimension, label, hint }) => {
          const value = draft.allocation[dimension];
          const { icon: Icon, accent } = DIMENSION_STYLE[dimension];
          return (
            <div key={dimension} className="rounded-lg border bg-muted/20 p-2.5">
              <div className="flex items-center justify-between">
                <label
                  className="flex items-center gap-2 text-sm font-medium"
                  htmlFor={`alloc-${dimension}`}
                >
                  <Icon className={`h-4 w-4 ${accent}`} />
                  {label}
                </label>
                <span className={`text-sm font-semibold tabular-nums ${accent}`}>{value}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 shrink-0 [&_svg]:size-3.5"
                  aria-label={`Decrease ${label}`}
                  disabled={value <= ARCHETYPE_DIMENSION_MIN}
                  onClick={() => setDimensionState(onDraftChange, dimension, value - 1)}
                >
                  <Minus />
                </Button>
                <input
                  id={`alloc-${dimension}`}
                  type="range"
                  min={ARCHETYPE_DIMENSION_MIN}
                  max={ARCHETYPE_DIMENSION_MAX}
                  step={1}
                  value={value}
                  aria-label={`${label} allocation`}
                  onChange={(event) =>
                    setDimensionState(onDraftChange, dimension, Number(event.target.value))
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 shrink-0 [&_svg]:size-3.5"
                  aria-label={`Increase ${label}`}
                  disabled={value >= ARCHETYPE_DIMENSION_MAX}
                  onClick={() => setDimensionState(onDraftChange, dimension, value + 1)}
                >
                  <Plus />
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Split
        </span>
        <AllocationBar allocation={draft.allocation} />
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
      <p className="text-sm text-muted-foreground">Select an archetype to see its consequences.</p>
    </div>
  );
}

function setDimensionState(
  setState: React.Dispatch<React.SetStateAction<ArchetypeEditorState>>,
  dimension: ArchetypeDimension,
  value: number,
): void {
  const clamped = Math.max(ARCHETYPE_DIMENSION_MIN, Math.min(ARCHETYPE_DIMENSION_MAX, value));
  setState((current) => setDimension(current, dimension, clamped));
}

function AllocationBar({ allocation }: { allocation: ArchetypeAllocation }) {
  const max = Math.max(allocation.economy, allocation.industry, allocation.combat, 1);
  const segments = [
    { label: "Economy", value: allocation.economy, color: "bg-sky-500" },
    { label: "Industry", value: allocation.industry, color: "bg-amber-500" },
    { label: "Combat", value: allocation.combat, color: "bg-rose-500" },
  ];
  return (
    <div
      className="flex h-3 w-64 overflow-hidden rounded-full"
      role="img"
      aria-label="Allocation breakdown"
    >
      {segments.map((segment) => (
        <div
          key={segment.label}
          className={segment.color}
          style={{ width: `${(segment.value / max) * 100}%` }}
          title={`${segment.label}: ${segment.value}`}
        />
      ))}
    </div>
  );
}
