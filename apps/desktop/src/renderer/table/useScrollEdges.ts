import { useCallback, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

const EDGE_EPSILON = 1;

export interface ScrollEdges {
  readonly left: boolean;
  readonly right: boolean;
}

export const scrollEdges = (metrics: {
  readonly scrollLeft: number;
  readonly scrollWidth: number;
  readonly clientWidth: number;
}): ScrollEdges => {
  const overflow = metrics.scrollWidth - metrics.clientWidth;
  return {
    left: metrics.scrollLeft > EDGE_EPSILON,
    right: overflow > EDGE_EPSILON && metrics.scrollLeft < overflow - EDGE_EPSILON,
  };
};

export const useScrollEdges = (
  scrollRef: RefObject<HTMLDivElement | null>,
  extraDeps: readonly unknown[] = [],
): ScrollEdges => {
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false });

  const syncEdges = useCallback((): void => {
    const container = scrollRef.current;
    if (container === null) return;
    setEdges(scrollEdges(container));
  }, [scrollRef]);

  useLayoutEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges, ...extraDeps]);

  return edges;
};