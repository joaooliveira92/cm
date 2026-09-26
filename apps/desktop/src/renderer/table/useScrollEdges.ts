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

/**
 * Measures on mount, on window resize, and whenever `extraDeps` change (pass
 * whatever alters the content width: row count, visible columns). Wire the
 * returned `syncEdges` to the container's `onScroll`; a programmatic
 * `scrollLeft` write fires `scroll` in a browser, so that covers keyboard
 * scrolling too. Declare a scroll-offset restore before this hook so the
 * mount measurement reads the restored offset.
 */
export const useScrollEdges = (
  scrollRef: RefObject<HTMLDivElement | null>,
  extraDeps: readonly unknown[] = [],
): { readonly edges: ScrollEdges; readonly syncEdges: () => void } => {
  const [edges, setEdges] = useState<ScrollEdges>({ left: false, right: false });

  const syncEdges = useCallback((): void => {
    const container = scrollRef.current;
    if (container === null) return;
    const next = scrollEdges(container);
    // Scroll fires every frame; keep the previous object so React bails out.
    setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
  }, [scrollRef]);

  useLayoutEffect(() => {
    syncEdges();
    window.addEventListener("resize", syncEdges);
    return () => window.removeEventListener("resize", syncEdges);
  }, [syncEdges, ...extraDeps]);

  return { edges, syncEdges };
};