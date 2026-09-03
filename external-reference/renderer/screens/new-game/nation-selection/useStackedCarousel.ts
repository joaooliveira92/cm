import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { normalizeIndex } from "./fleetDispatchUtils.js";

const SWIPE_THRESHOLD_PX = 44;
const WHEEL_THRESHOLD_PX = 32;
const WHEEL_COOLDOWN_MS = 360;

interface PointerState {
  pointerId: number;
  startX: number;
  startY: number;
  lastY: number;
  dragging: boolean;
}

interface UseStackedCarouselOptions {
  itemCount: number;
  focusedIndex: number;
  onSelect: (index: number) => void;
  onConfirm: (index: number) => void;
  onUnhandledKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
}

export function useStackedCarousel({
  itemCount,
  focusedIndex,
  onSelect,
  onConfirm,
  onUnhandledKeyDown,
}: UseStackedCarouselOptions) {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const pointerStateRef = useRef<PointerState | null>(null);
  const suppressClickRef = useRef(false);
  const wheelAccumulatorRef = useRef(0);
  const wheelLockedRef = useRef(false);
  const wheelUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectPrevious = useCallback(() => {
    if (itemCount <= 1) return;
    onSelect(normalizeIndex(focusedIndex - 1, itemCount));
  }, [focusedIndex, itemCount, onSelect]);

  const selectNext = useCallback(() => {
    if (itemCount <= 1) return;
    onSelect(normalizeIndex(focusedIndex + 1, itemCount));
  }, [focusedIndex, itemCount, onSelect]);

  const lockWheelNavigation = useCallback(() => {
    wheelLockedRef.current = true;
    wheelAccumulatorRef.current = 0;

    if (wheelUnlockTimerRef.current !== null) {
      clearTimeout(wheelUnlockTimerRef.current);
    }

    wheelUnlockTimerRef.current = setTimeout(() => {
      wheelLockedRef.current = false;
      wheelUnlockTimerRef.current = null;
    }, WHEEL_COOLDOWN_MS);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (event: Event) => {
      const wheelEvent = event as WheelEvent;
      if (itemCount <= 1 || Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) return;

      wheelEvent.preventDefault();
      if (wheelLockedRef.current) return;

      let delta = wheelEvent.deltaY;
      if (wheelEvent.deltaMode === 1) delta *= 16;
      else if (wheelEvent.deltaMode === 2) delta *= 100;

      wheelAccumulatorRef.current += delta;
      if (Math.abs(wheelAccumulatorRef.current) < WHEEL_THRESHOLD_PX) return;

      if (wheelAccumulatorRef.current > 0) selectNext();
      else selectPrevious();

      lockWheelNavigation();
    };

    const handlePointerMove = (event: Event) => {
      const pointerEvent = event as unknown as PointerEvent;
      const state = pointerStateRef.current;
      if (!state || state.pointerId !== pointerEvent.pointerId) return;

      const deltaX = pointerEvent.clientX - state.startX;
      const deltaY = pointerEvent.clientY - state.startY;
      state.lastY = pointerEvent.clientY;

      if (!state.dragging && Math.abs(deltaY) > 6 && Math.abs(deltaY) > Math.abs(deltaX)) {
        state.dragging = true;
        suppressClickRef.current = true;
        setIsDragging(true);
      }

      if (!state.dragging) return;
      event.preventDefault();
      setDragOffset(Math.max(-140, Math.min(140, deltaY)));
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("pointermove", handlePointerMove, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("pointermove", handlePointerMove);
    };
  }, [itemCount, lockWheelNavigation, selectNext, selectPrevious]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowUp":
        case "PageUp":
          event.preventDefault();
          selectPrevious();
          return;
        case "ArrowDown":
        case "PageDown":
          event.preventDefault();
          selectNext();
          return;
        case "Home":
          event.preventDefault();
          if (focusedIndex !== 0) onSelect(0);
          return;
        case "End":
          event.preventDefault();
          if (focusedIndex !== itemCount - 1) onSelect(itemCount - 1);
          return;
        case "Enter":
        case " ":
          event.preventDefault();
          onConfirm(focusedIndex);
          return;
        default:
          onUnhandledKeyDown(event);
      }
    },
    [focusedIndex, itemCount, onConfirm, onSelect, onUnhandledKeyDown, selectNext, selectPrevious],
  );

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    // Options use tabIndex=-1 with roving aria-activedescendant focus; without
    // this, Chrome moves real DOM focus onto the clicked card, which can then
    // go aria-hidden while still focused as the carousel rotates.
    event.preventDefault();
    suppressClickRef.current = false;
    pointerStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastY: event.clientY,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const finishPointerInteraction = useCallback(
    (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
      const state = pointerStateRef.current;
      if (!state || state.pointerId !== event.pointerId) return;

      const deltaY = state.lastY - state.startY;
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Pointer capture may already have been released.
      }

      pointerStateRef.current = null;
      setDragOffset(0);
      setIsDragging(false);

      if (cancelled || !state.dragging || Math.abs(deltaY) < SWIPE_THRESHOLD_PX) return;
      if (deltaY < 0) selectNext();
      else selectPrevious();
    },
    [selectNext, selectPrevious],
  );

  return {
    dragOffset,
    isDragging,
    suppressClickRef,
    containerRef,
    handleKeyDown,
    handlePointerDown,
    handlePointerUp: (event: PointerEvent<HTMLDivElement>) => finishPointerInteraction(event),
    handlePointerCancel: (event: PointerEvent<HTMLDivElement>) =>
      finishPointerInteraction(event, true),
  };
}
