import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { NATION_COORDINATES } from "@/content/nationCoordinates.js";
import { playMechanicalAcoustic } from "@/shell/controller/mechanicalAcoustic.js";
import { FleetDispatchBoard } from "./FleetDispatchBoard.js";
import { GlobePanel } from "./GlobePanel.js";
import { TelemetryBar } from "./TelemetryBar.js";

// Hoisted static formatting utilities to prevent inline recreation
function formatCoord(decimal: number, posDir: string, negDir: string): string {
  const absolute = Math.abs(decimal);
  const deg = Math.floor(absolute);
  const min = Math.round((absolute - deg) * 60);
  const dir = decimal >= 0 ? posDir : negDir;
  return `${deg}°${String(min).padStart(2, "0")}'${dir}`;
}

/**
 * The 1880 Admiralty nation-selection surface.
 *
 * Orchestrates four sub-components:
 * - TelemetryBar: coordinate display and keyboard hints
 * - FleetDispatchBoard: nation grid selector
 * - GlobePanel: clipped globe with dossier slide panel
 * - StatusBar: bottom shelf with status text
 */
export function NationSelectionScreen({
  slots,
  onConfirm,
  onCancel,
  onRecommendedSetup,
  focusedIndex,
  onFocusChange,
  failure,
}: {
  slots: readonly PlayableSlotCountryId[];
  onConfirm: (countryId: string) => void;
  onCancel: () => void;
  onRecommendedSetup: (countryId: string) => void;
  focusedIndex: number;
  onFocusChange: (index: number) => void;
  failure: string | null;
}): React.JSX.Element {
  const listboxId = useId();
  const [isDossierOpen, setDossierOpen] = useState(true);

  const slotCount = slots.length;
  const normalizedFocusedIndex =
    slotCount === 0 ? 0 : ((focusedIndex % slotCount) + slotCount) % slotCount;
  const focusedSlotId = slots[normalizedFocusedIndex] as PlayableSlotCountryId;
  const coords = NATION_COORDINATES[focusedSlotId];

  // Stabilize external callbacks via Refs to prevent rendering stutters in child modules
  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onCancelRef.current = onCancel;
  }, [onConfirm, onCancel]);

  const navigate = useCallback(
    (delta: number) => {
      onFocusChange((focusedIndex + delta + slotCount) % slotCount);
      playMechanicalAcoustic("click");
    },
    [focusedIndex, onFocusChange, slotCount],
  );

  const confirm = useCallback(
    (index: number) => {
      playMechanicalAcoustic("sonar");
      onConfirmRef.current(slots[index] as string);
    },
    [slots],
  );

  const handleSlotSelect = useCallback(
    (index: number) => {
      onFocusChange(index);
      setDossierOpen(true);
      playMechanicalAcoustic("click");
    },
    [onFocusChange],
  );

  const handleNationClick = useCallback(
    (countryId: string) => {
      const index = slots.indexOf(countryId as PlayableSlotCountryId);
      if (index >= 0) handleSlotSelect(index);
    },
    [handleSlotSelect, slots],
  );

  const handleChangeNation = useCallback(() => {
    setDossierOpen(false);
  }, []);

  const handleListboxKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowRight":
        e.preventDefault();
        navigate(1);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        e.preventDefault();
        navigate(-1);
        break;
      case "Enter":
        e.preventDefault();
        confirm(focusedIndex);
        break;
      case "Escape":
        e.preventDefault();
        playMechanicalAcoustic("abort");
        onCancelRef.current();
        break;
    }
  };

  const coordinateLabel =
    coords === undefined
      ? "NO TARGET"
      : `LAT ${formatCoord(coords.lat, "N", "S")} • LONG ${formatCoord(coords.lng, "E", "W")}`;

  if (slotCount === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#030509] p-8 text-center font-mono text-sm uppercase tracking-widest text-[#798fa8]">
        No playable nations for this scenario.
      </div>
    );
  }

  return (
    <div
      className="flex h-full min-h-[44rem] w-full flex-col bg-[#030509] font-sans text-[#e2d9c8] selection:bg-[#d4a359] selection:text-[#05080e] overflow-hidden"
      aria-labelledby="nation-selection-heading"
    >
      {/* ── Intelligence Telemetry Bar ── */}
      <TelemetryBar coordinateLabel={coordinateLabel} />

      {/* ── Main Command Surface ── */}
      <main
        aria-labelledby="nation-selection-heading"
        className="relative flex min-h-0 flex-1 flex-col items-stretch bg-[#030509] lg:flex-row lg:overflow-hidden"
      >
        {/* Background Admiralty Blueprint Grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(42, 184, 230, 0.15) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(42, 184, 230, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: "44px 44px",
          }}
          aria-hidden="true"
        />

        {/* ── Left Panel: Fleet Dispatch Board ── */}
        <FleetDispatchBoard
          slots={slots}
          focusedIndex={focusedIndex}
          listboxId={listboxId}
          onSelect={handleSlotSelect}
          onConfirm={confirm}
          onKeyDown={handleListboxKeyDown}
        />

        {/* ── Right Panel: Globe + Dossier ── */}
        <GlobePanel
          focusedSlotId={focusedSlotId}
          isDossierOpen={isDossierOpen}
          onNationClick={handleNationClick}
          onChangeNation={handleChangeNation}
          onConfirm={onConfirm}
          onRecommendedSetup={onRecommendedSetup}
        />

        {/* ── Failure Notice: surfaces a rejected campaign start (e.g. an
            unsupported nation), which otherwise fails silently on this screen
            — session.failure is only rendered back on CampaignLaunchGate's
            menu/archives phases. ── */}
        {failure && (
          <div
            role="alert"
            className="absolute inset-x-0 bottom-4 z-40 mx-auto w-full max-w-md rounded-xl border border-[#dc2626]/40 bg-[#101622]/95 p-4 shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-center gap-2 font-mono text-base font-bold text-[#dc2626] uppercase mb-1">
              <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
              <span>Admiralty Failure Dispatch</span>
            </div>
            <p className="font-mono text-base text-rose-200">{failure}</p>
          </div>
        )}
      </main>

      {/* ── Contextual Bottom Shelf ── */}
      {/*<StatusBar />*/}
    </div>
  );
}
