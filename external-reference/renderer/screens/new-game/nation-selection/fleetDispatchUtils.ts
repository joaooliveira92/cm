import type { CSSProperties } from "react";
import type { MediaAsset } from "@/content/mediaAsset.js";
import type { PlayableSlotCountryId } from "@/content/nationAssetManifest.js";
import { getNationPresentation } from "@/content/nationPresentationCatalog.js";

export const MAX_VISIBLE_DISTANCE = 4;

export interface StackPosition {
  offset: number;
  distance: number;
  visible: boolean;
  active: boolean;
}

export const CARD_PALETTES = [
  {
    background: "linear-gradient(145deg, #243a31 0%, #152820 48%, #0c1713 100%)",
    accent: "#7fae8f",
    border: "rgba(127, 174, 143, 0.48)",
  },
  {
    background: "linear-gradient(145deg, #253448 0%, #142333 50%, #09121c 100%)",
    accent: "#68a5d4",
    border: "rgba(104, 165, 212, 0.48)",
  },
  {
    background: "linear-gradient(145deg, #423324 0%, #2a2018 50%, #17100b 100%)",
    accent: "#d4a359",
    border: "rgba(212, 163, 89, 0.52)",
  },
  {
    background: "linear-gradient(145deg, #3d2934 0%, #271a22 50%, #160d12 100%)",
    accent: "#c97998",
    border: "rgba(201, 121, 152, 0.48)",
  },
  {
    background: "linear-gradient(145deg, #34314b 0%, #211f34 50%, #110f1f 100%)",
    accent: "#9790d7",
    border: "rgba(151, 144, 215, 0.48)",
  },
  {
    background: "linear-gradient(145deg, #264247 0%, #172b30 50%, #0b171a 100%)",
    accent: "#63b4bd",
    border: "rgba(99, 180, 189, 0.48)",
  },
] as const;

export type CardPalette = (typeof CARD_PALETTES)[number];

export function normalizeIndex(index: number, count: number): number {
  if (count === 0) return 0;
  return ((index % count) + count) % count;
}

function getCircularOffset(index: number, focusedIndex: number, count: number): number {
  if (count <= 1) return 0;

  const forwardDistance = (index - focusedIndex + count) % count;
  const backwardDistance = forwardDistance - count;

  return Math.abs(backwardDistance) < Math.abs(forwardDistance)
    ? backwardDistance
    : forwardDistance;
}

export function getStackPosition(
  index: number,
  focusedIndex: number,
  count: number,
): StackPosition {
  const offset = getCircularOffset(index, focusedIndex, count);
  const distance = Math.abs(offset);

  return {
    offset,
    distance,
    active: offset === 0,
    visible: distance <= MAX_VISIBLE_DISTANCE,
  };
}

export function getCountryName(countryId: PlayableSlotCountryId): string {
  return getNationPresentation(countryId).name;
}

export function getCountryCode(countryId: PlayableSlotCountryId): string {
  return getNationPresentation(countryId).code;
}

export function resolveNationShip(countryId: PlayableSlotCountryId): MediaAsset | null {
  const ship = getNationPresentation(countryId).shipArtwork;
  return ship.status === "resolved" ? ship.asset : null;
}

export function getStackCardStyle(
  position: StackPosition,
  dragOffset: number,
  totalCards: number,
): CSSProperties {
  const { active, distance, offset, visible } = position;

  let translateY = 0;
  if (offset > 0) translateY = -offset * 40;
  else if (offset < 0) translateY = 84 + (distance - 1) * 29;

  translateY += active ? dragOffset * 0.38 : dragOffset * 0.08;

  const scale = active ? 1 : Math.max(0.76, 1 - distance * 0.065);
  const opacity = visible ? (active ? 1 : Math.max(0.25, 1 - distance * 0.16)) : 0;
  const brightness = active ? 1 : Math.max(0.5, 0.9 - distance * 0.09);
  const saturation = active ? 1 : Math.max(0.5, 0.9 - distance * 0.08);

  return {
    zIndex: active ? totalCards + 10 : totalCards - distance,
    opacity,
    visibility: visible ? "visible" : "hidden",
    pointerEvents: visible ? "auto" : "none",
    transform: [
      "translate3d(-50%, -50%, 0)",
      `translate3d(0, ${translateY}px, 0)`,
      `scale(${scale})`,
    ].join(" "),
    filter: `brightness(${brightness}) saturate(${saturation})`,
  };
}
