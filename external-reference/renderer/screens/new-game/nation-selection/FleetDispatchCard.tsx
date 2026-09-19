import { Check } from "lucide-react";
import { type CSSProperties, type MouseEvent, useMemo, useState } from "react";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import {
  type CardPalette,
  getCountryCode,
  getCountryName,
  resolveNationShip,
  type StackPosition,
} from "./fleetDispatchUtils.js";

interface FleetDispatchCardProps {
  countryId: PlayableSlotCountryId;
  index: number;
  position: StackPosition;
  palette: CardPalette;
  style: CSSProperties;
  listboxId: string;
  dragState: "idle" | "dragging";
  onClick: (event: MouseEvent<HTMLDivElement>, index: number) => void;
}

export function FleetDispatchCard({
  countryId,
  index,
  position,
  palette,
  style,
  listboxId,
  dragState,
  onClick,
}: FleetDispatchCardProps): React.JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const countryName = getCountryName(countryId);
  const countryCode = getCountryCode(countryId);
  const shipAsset = useMemo(() => resolveNationShip(countryId), [countryId]);
  const showImage = shipAsset !== null && !imageFailed;

  return (
    <div
      id={`${listboxId}-option-${countryId}`}
      role="option"
      tabIndex={-1}
      aria-label={countryName}
      aria-selected={position.active}
      aria-hidden={position.visible ? undefined : true}
      onClick={(event) => onClick(event, index)}
      style={{
        ...style,
        background: palette.background,
        borderColor: position.active ? "#d4a359" : palette.border,
      }}
      className={`
        absolute left-1/2 top-[48%] h-[17rem] w-[min(94%,29rem)]
        origin-center select-none overflow-hidden rounded-[1.15rem] border
        shadow-[0_20px_45px_rgba(0,0,0,0.52)]
        transition-[transform,opacity,filter,border-color,box-shadow] duration-500
        ease-&lsqb;cubic-bezier(0.22,1,0.36,1)&rsqb; motion-reduce:duration-0 sm:h-[19rem]
        ${
          position.active
            ? "shadow-[0_28px_65px_rgba(0,0,0,0.72),0_0_0_1px_rgba(212,163,89,0.2)]"
            : "cursor-pointer hover:brightness-110"
        }
        ${dragState === "dragging" ? "cursor-grabbing duration-75" : "cursor-grab"}
      `}
    >
      {/* Full-card naval cover */}
      {showImage ? (
        <img
          src={shipAsset.url}
          alt={shipAsset.label}
          draggable={false}
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          aria-label={`${countryName} naval vessel unavailable`}
          role="img"
          className="absolute inset-0 flex items-center justify-center bg-black/60"
        >
          <span
            aria-hidden="true"
            className="font-mono text-5xl font-black tracking-[0.16em]"
            style={{ color: palette.accent }}
          >
            {countryCode}
          </span>
        </div>
      )}

      {/* Cover treatment keeps text legible without hiding the ship. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/75 via-black/5 to-black/85"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.10] mix-blend-screen"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.22) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.22) 1px, transparent 1px)
          `,
          backgroundSize: "26px 26px",
        }}
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 z-10 h-1.5"
        style={{
          backgroundColor: palette.accent,
          boxShadow: position.active ? `0 0 18px ${palette.accent}` : undefined,
        }}
      />

      {/* Bottom information shelf overlays the ship cover. */}
      <div className="absolute inset-x-0 bottom-0 z-20 min-h-[4.8rem] border-t border-white/20 bg-black/35 px-5 py-3 text-white backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black uppercase tracking-wide sm:text-lg">
              {countryName}
            </p>
            <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-white/60">
              Fleet silhouette registry
            </p>
          </div>

          {position.active ? (
            <span className="flex shrink-0 items-center gap-1.5 rounded bg-[#d4a359] px-2.5 py-1 font-mono text-[0.7rem] font-black uppercase tracking-wider text-[#07101a]">
              <Check className="h-3 w-3" aria-hidden="true" />
              Active
            </span>
          ) : (
            <span className="shrink-0 font-mono text-[0.58rem] uppercase tracking-wider text-white/65">
              Select
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
