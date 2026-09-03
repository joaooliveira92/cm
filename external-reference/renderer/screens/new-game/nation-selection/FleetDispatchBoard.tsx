import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useMemo } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { FleetDispatchCard } from "./FleetDispatchCard.js";
import {
  CARD_PALETTES,
  getStackCardStyle,
  getStackPosition,
  normalizeIndex,
} from "./fleetDispatchUtils.js";
import { useStackedCarousel } from "./useStackedCarousel.js";

interface FleetDispatchBoardProps {
  slots: readonly PlayableSlotCountryId[];
  focusedIndex: number;
  listboxId: string;
  onSelect: (index: number) => void;
  onConfirm: (index: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function FleetDispatchBoard({
  slots,
  focusedIndex,
  listboxId,
  onSelect,
  onConfirm,
  onKeyDown,
}: FleetDispatchBoardProps): React.JSX.Element {
  const SLOTS = slots;
  const normalizedFocusedIndex = normalizeIndex(focusedIndex, SLOTS.length);
  const focusedCountryId = SLOTS[normalizedFocusedIndex];

  const positions = useMemo(
    () => SLOTS.map((_, index) => getStackPosition(index, normalizedFocusedIndex, SLOTS.length)),
    [normalizedFocusedIndex, SLOTS],
  );

  const carousel = useStackedCarousel({
    itemCount: SLOTS.length,
    focusedIndex: normalizedFocusedIndex,
    onSelect,
    onConfirm,
    onUnhandledKeyDown: onKeyDown,
  });

  const handleCardClick = useCallback(
    (event: MouseEvent<HTMLDivElement>, index: number) => {
      if (carousel.suppressClickRef.current) {
        event.preventDefault();
        carousel.suppressClickRef.current = false;
        return;
      }

      if (index !== normalizedFocusedIndex) onSelect(index);
    },
    [carousel.suppressClickRef, normalizedFocusedIndex, onSelect],
  );

  useEffect(() => {
    carousel.containerRef.current?.focus();
  }, [carousel.containerRef.current]);

  if (SLOTS.length < 1) {
    return (
      <aside className="relative z-10 flex min-h-112 w-full flex-col border-b border-border bg-background/94 p-6 lg:h-full lg:w-[min(38vw,34rem)] lg:border-b-0 lg:border-r">
        <div className="flex flex-1 items-center justify-center">
          <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
            No fleet commissions available
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-labelledby={`${listboxId}-heading`}
      className="
        relative z-10
        flex min-h-152 w-full
        flex-none flex-col
        overflow-hidden
        border-b border-border
        bg-background/94
        px-4 py-4

        sm:min-h-172
        sm:px-6 sm:py-5

        lg:h-full
        lg:min-h-0
        lg:w-[min(39vw,36rem)]
        lg:border-b-0
        lg:border-r

        xl:w-[min(36vw,39rem)]
      "
    >
      <header className="relative z-30 flex flex-none items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="hidden sm:block font-mono text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground">
            Admiralty Registry
          </p>

          <h2
            id={`${listboxId}-heading`}
            className="mt-1 font-mono text-lg font-bold uppercase tracking-[0.16em] text-accent sm:text-lg"
          >
            Fleet Dispatch
          </h2>
          <p
            id={`${listboxId}-instructions`}
            className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground"
          >
            Scroll or use the up and down arrow keys to inspect each nation. Press Enter to confirm.
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={carousel.containerRef}
          id={listboxId}
          role="listbox"
          tabIndex={0}
          aria-label="Playable nations"
          aria-describedby={`${listboxId}-instructions`}
          aria-activedescendant={`${listboxId}-option-${focusedCountryId}`}
          onKeyDown={carousel.handleKeyDown}
          onPointerDown={carousel.handlePointerDown}
          onPointerUp={carousel.handlePointerUp}
          onPointerCancel={carousel.handlePointerCancel}
          className="absolute inset-0 touch-none overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background overscroll-contain perspective-distant"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12%] bottom-[7%] top-[12%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.10),transparent_68%)] blur-xl"
          />

          {SLOTS.map((countryId, index) => {
            const position = positions[index] as ReturnType<typeof getStackPosition>;
            const palette = CARD_PALETTES[
              index % CARD_PALETTES.length
            ] as (typeof CARD_PALETTES)[number];

            return (
              <FleetDispatchCard
                key={countryId}
                countryId={countryId}
                index={index}
                position={position}
                palette={palette}
                style={getStackCardStyle(position, carousel.dragOffset, SLOTS.length)}
                listboxId={listboxId}
                dragState={carousel.isDragging ? "dragging" : "idle"}
                onClick={handleCardClick}
              />
            );
          })}

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12%] bottom-[4%] z-100 rounded-[50%] bg-background/55 blur-xl"
          />

          <div className="pointer-events-none absolute bottom-3 left-1/2 z-110 -translate-x-1/2 whitespace-nowrap rounded-full border border-border bg-background/90 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm">
            Scroll · ↑ ↓ · Enter
          </div>
        </div>
      </div>
    </aside>
  );
}
