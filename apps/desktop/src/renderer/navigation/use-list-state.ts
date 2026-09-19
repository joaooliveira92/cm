/**
 * React hook for restoring screen state from URL search params on back/forward
 * navigation (§10.1). Use this in screens that show a list with recoverable
 * interaction state (filters, sort, visible columns, pagination, view, tabs).
 *
 * On mount, it decodes the current URL search params and returns the decoded
 * state so the screen can seed its local state from it. It also provides a
 * function to encode the current screen state into the URL before navigating
 * away, so that back/forward restores it.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  decodeListState,
  toEncodedListState,
  type DecodedListState,
  type EncodedListState,
} from "./list-state-storage.js";
import { captureScrollState, restoreScrollState, type ScrollState } from "./scroll-state.js";

export interface ListStateControl {
  /** The decoded list state from the current URL (empty if none was encoded). */
  readonly restored: DecodedListState;
  /** True when this mount is a back/forward restoration (popstate). */
  readonly isRestoration: boolean;
  /**
   * Called before navigating away: encodes the current list state into the URL
   * and captures the scroll position in history.state.
   */
  readonly captureForNavigation: (state: Partial<DecodedListState>) => void;
  /**
   * Called after landing on a back/forward‑restored page: restores scroll
   * position from history.state.
   */
  readonly restoreScroll: (containerIds?: readonly string[]) => void;
}

export const useListState = (): ListStateControl => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const restored = useMemo(() => decodeListState(searchParams), [searchParams]);

  const [isRestoration, setIsRestoration] = useState(false);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    const onPopState = () => {
      if (prevPathRef.current !== location.pathname) {
        setIsRestoration(true);
      }
      prevPathRef.current = location.pathname;
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [location.pathname]);

  const captureForNavigation = useCallback(
    (state: Partial<DecodedListState>): void => {
      const encoded: EncodedListState = toEncodedListState(state);
      const hasState = Object.keys(encoded).length > 0;
      if (hasState) {
        navigate({
          to: location.pathname,
          search: (prev: Record<string, string>) => ({
            ...Object.fromEntries(new URLSearchParams(
              Object.fromEntries(
                Object.entries(prev).filter(([k]) => ![
                  "sort", "filters", "view", "columns", "tab",
                  "ctx", "comp", "stage", "round", "group", "squad",
                ].includes(k)),
              ),
            ).entries()),
            ...encoded,
          }),
          replace: false,
        });
      }

      const scroll = captureScrollState();
      window.history.replaceState(
        { ...window.history.state, __scroll: scroll },
        "",
      );
    },
    [location.pathname, navigate],
  );

  const restoreScroll = useCallback(
    (containerIds?: readonly string[]): void => {
      const saved = (window.history.state as { __scroll?: ScrollState } | null)?.__scroll;
      if (saved !== undefined) {
        restoreScrollState(saved);
        return;
      }
      if (containerIds !== undefined && containerIds.length > 0) {
        const scroll = captureScrollState(containerIds);
        restoreScrollState(scroll);
      }
    },
    [],
  );

  return { restored, isRestoration, captureForNavigation, restoreScroll };
};