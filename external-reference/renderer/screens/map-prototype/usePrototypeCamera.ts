/**
 * PROTOTYPE — throwaway. See ./README.md.
 *
 * The camera, built exactly the way ticket 13's research says to build it, so
 * that the prototype tests the claim rather than restating it:
 *
 * - Pan and zoom live in a **ref**, never in React state, and are applied by
 *   writing `transform` straight onto one `<g>`. Dragging across the whole map
 *   must not render a single React component. The frame meter below is how you
 *   check that; if a variant re-renders on pointermove, its p95 collapses.
 *
 * - Wheel zoom uses a manual `addEventListener("wheel", …, { passive: false })`
 *   because React 19's `onWheel` is passive and cannot `preventDefault()`. In
 *   Electron a passive wheel handler means the whole app scrolls behind the map.
 *
 * - Zoom **bands** are the one thing that does reach React state, and they
 *   change a handful of times per session rather than per frame. That is the
 *   answer to the level-of-detail question: label density keys off the band,
 *   not off the scale.
 *
 * One trap worth recording because it cost time here: with a `viewBox`, the
 * `<g transform>` is in *user units* while pointer events are in *screen
 * pixels*, and `preserveAspectRatio` puts an arbitrary factor between them.
 * Every pointer delta below is converted through `getScreenCTM()` first. Skip
 * that and pan drifts against the cursor at every window size but one.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface CameraTransform {
  scale: number;
  x: number;
  y: number;
}

export const ZOOM_BANDS = [1.8, 4] as const;

export type ZoomBand = 0 | 1 | 2;

function bandFor(scale: number): ZoomBand {
  if (scale < ZOOM_BANDS[0]) return 0;
  if (scale < ZOOM_BANDS[1]) return 1;
  return 2;
}

const MIN_SCALE = 0.9;
const MAX_SCALE = 14;

export interface PrototypeCamera {
  readonly svgRef: React.RefObject<SVGSVGElement | null>;
  readonly worldRef: React.RefObject<SVGGElement | null>;
  readonly meterRef: React.RefObject<HTMLSpanElement | null>;
  readonly zoomBand: ZoomBand;
  readonly reset: () => void;
  readonly zoomBy: (factor: number) => void;
  readonly focusOn: (x: number, y: number, scale?: number) => void;
  readonly isDraggingRef: React.RefObject<boolean>;
}

export interface CameraOptions {
  /**
   * A geographic map wraps east–west, so panning never runs out of world. A
   * stylised board does not — its columns end. Variant B is where that
   * difference stops being cosmetic.
   */
  readonly wrapHorizontally: boolean;
}

export function usePrototypeCamera(
  worldWidth: number,
  worldHeight: number,
  options: CameraOptions = { wrapHorizontally: true },
): PrototypeCamera {
  const { wrapHorizontally } = options;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const worldRef = useRef<SVGGElement | null>(null);
  const meterRef = useRef<HTMLSpanElement | null>(null);
  const isDraggingRef = useRef(false);
  const camera = useRef<CameraTransform>({ scale: 1, x: 0, y: 0 });
  const [zoomBand, setZoomBand] = useState<ZoomBand>(0);
  const bandRef = useRef<ZoomBand>(0);

  // Frame timing. Kept out of React entirely; the readout is written straight
  // into a span so producing the number cannot perturb the number.
  const samples = useRef<number[]>([]);
  const lastFrame = useRef(0);
  const lastReport = useRef(0);

  const applyTransform = useCallback(() => {
    const world = worldRef.current;
    if (world === null) return;
    const { scale, x, y } = camera.current;
    world.setAttribute("transform", `translate(${x} ${y}) scale(${scale})`);
    const next = bandFor(scale);
    if (next !== bandRef.current) {
      bandRef.current = next;
      setZoomBand(next);
    }
  }, []);

  /** Screen pixels per user unit, or null before the SVG is laid out. */
  const pixelsPerUnit = useCallback((): number => {
    const ctm = svgRef.current?.getScreenCTM();
    return ctm === null || ctm === undefined || ctm.a === 0 ? 1 : ctm.a;
  }, []);

  /** The viewport, expressed in the same user units as the camera. */
  const viewportUnits = useCallback((): { width: number; height: number } => {
    const svg = svgRef.current;
    const factor = pixelsPerUnit();
    return {
      width: (svg?.clientWidth ?? worldWidth * factor) / factor,
      height: (svg?.clientHeight ?? worldHeight * factor) / factor,
    };
  }, [pixelsPerUnit, worldHeight, worldWidth]);

  const clamp = useCallback(() => {
    const current = camera.current;
    current.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale));
    const span = worldWidth * current.scale;
    const visible = viewportUnits();
    if (wrapHorizontally) {
      // The map repeats, so x only ever needs one turn's worth. Wrapping into
      // (-span, 0] rather than [-span, 0) is what keeps a fresh camera at 0.
      current.x = -(((-current.x % span) + span) % span);
    } else {
      current.x = Math.min(0, Math.max(Math.min(0, visible.width - span), current.x));
    }
    const scaledHeight = worldHeight * current.scale;
    const minY = Math.min(0, visible.height - scaledHeight);
    current.y = Math.min(0, Math.max(minY, current.y));
  }, [viewportUnits, worldHeight, worldWidth, wrapHorizontally]);

  const sampleFrame = useCallback(() => {
    const now = performance.now();
    if (lastFrame.current !== 0) {
      const delta = now - lastFrame.current;
      if (delta < 250) samples.current.push(delta);
      if (samples.current.length > 400) samples.current.shift();
    }
    lastFrame.current = now;
    if (now - lastReport.current > 250 && meterRef.current !== null) {
      lastReport.current = now;
      const sorted = [...samples.current].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
      meterRef.current.textContent =
        sorted.length < 8
          ? "drag or zoom to measure"
          : `p50 ${p50.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · n=${sorted.length}`;
    }
  }, []);

  const reset = useCallback(() => {
    camera.current = { scale: 1, x: 0, y: 0 };
    samples.current = [];
    lastFrame.current = 0;
    clamp();
    applyTransform();
  }, [applyTransform, clamp]);

  const zoomAt = useCallback(
    (factor: number, clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (svg === null) return;
      const rect = svg.getBoundingClientRect();
      const unitScale = pixelsPerUnit();
      // The cursor, in the same user units the camera translate is written in.
      const px = (clientX - rect.left) / unitScale;
      const py = (clientY - rect.top) / unitScale;
      const current = camera.current;
      const before = current.scale;
      current.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
      const ratio = current.scale / before;
      current.x = px - (px - current.x) * ratio;
      current.y = py - (py - current.y) * ratio;
      clamp();
      applyTransform();
      sampleFrame();
    },
    [applyTransform, clamp, pixelsPerUnit, sampleFrame],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (svg === null) return;
      const rect = svg.getBoundingClientRect();
      zoomAt(factor, rect.left + rect.width / 2, rect.top + rect.height / 2);
    },
    [zoomAt],
  );

  const focusOn = useCallback(
    (x: number, y: number, scale = 3.5) => {
      const current = camera.current;
      const visible = viewportUnits();
      current.scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
      current.x = visible.width / 2 - x * current.scale;
      current.y = visible.height / 2 - y * current.scale;
      clamp();
      applyTransform();
    },
    [applyTransform, clamp, viewportUnits],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (svg === null) return;

    // Non-passive on purpose. React's onWheel cannot do this.
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      zoomAt(Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY);
    }

    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    function onPointerDown(event: PointerEvent) {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      isDraggingRef.current = false;
      lastX = event.clientX;
      lastY = event.clientY;
      samples.current = [];
      lastFrame.current = 0;
      svg?.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event: PointerEvent) {
      if (pointerId !== event.pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      if (!isDraggingRef.current && Math.hypot(dx, dy) < 3) return;
      isDraggingRef.current = true;
      lastX = event.clientX;
      lastY = event.clientY;
      const factor = pixelsPerUnit();
      camera.current.x += dx / factor;
      camera.current.y += dy / factor;
      clamp();
      applyTransform();
      sampleFrame();
    }

    function onPointerUp(event: PointerEvent) {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      svg?.releasePointerCapture(event.pointerId);
      // Cleared on the next tick so the click handler can still see it.
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 0);
    }

    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("pointerdown", onPointerDown);
    svg.addEventListener("pointermove", onPointerMove);
    svg.addEventListener("pointerup", onPointerUp);
    svg.addEventListener("pointercancel", onPointerUp);
    return () => {
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("pointerdown", onPointerDown);
      svg.removeEventListener("pointermove", onPointerMove);
      svg.removeEventListener("pointerup", onPointerUp);
      svg.removeEventListener("pointercancel", onPointerUp);
    };
  }, [applyTransform, clamp, pixelsPerUnit, sampleFrame, zoomAt]);

  useEffect(() => {
    reset();
  }, [reset]);

  return {
    svgRef,
    worldRef,
    meterRef,
    zoomBand,
    reset,
    zoomBy,
    focusOn,
    isDraggingRef,
  };
}
