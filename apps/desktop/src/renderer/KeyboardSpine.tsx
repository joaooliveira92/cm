import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocation, useParams } from "@tanstack/react-router";
import { type SaveId } from "@cm-clone/contracts";
import { navigateBack, navigateCareer } from "./navigation/adapter.js";
import { type CareerDestination } from "./navigation/destinations.js";
import { decodeSaveId } from "./navigation/params.js";
import { ACTION_REGISTRY, ALL_ACTIONS, G_PREFIX_COMPLETIONS } from "./actions/allActions.js";
import { isCareerScreen } from "./actions/registry.js";
import { dispatchAction, registerActionHandler } from "./actions/dispatch.js";
import { getScopeState, subscribeScopeState } from "./actions/scopeState.js";
import { type Action, type ScopeState } from "./actions/types.js";
import { useSeamEveryKeyPress } from "./hotkeys.js";
import { resolveDispatch, IDLE_PREFIX } from "./keymap/priority.js";
import { keyOf, shouldSuppressForTextEntry } from "./keymap/keystroke.js";
import { type PrefixState } from "./keymap/prefix.js";
import { prefixTimeoutMs } from "./keymap/timeout.js";

/**
 * The keyboard spine (ticket 17, Stage 3). Mounted once at the renderer root, it
 * (a) registers the app-global and career-global live handlers (navigation,
 * Continue/palette/help placeholders), and (b) installs ONE wildcard keydown
 * binding through the react-hotkeys-hook seam.
 *
 * Every keystroke runs through the pure, unit-tested dispatch model in
 * `keymap/` — `resolveDispatch` (priority stack, AC-17), `prefixReduce` (the
 * `g <key>` lifecycle, AC-18) and `shouldSuppressForTextEntry` (AC-19) are the
 * LIVE policy, not a parallel hand-written mirror. There are no individual
 * `useHotkeys` bindings; nothing outlaws a registered Action's binding here,
 * so the registry's bindings are exactly the keyboard's (the help overlay will
 * enumerate the same records in Stage 4).
 *
 * While a `g <key>` prefix is active a nonmodal indicator renders below the
 * career nav bar (AC-18); Escape/invalid-key/timeout cancel it without firing
 * any unrelated bare-key Action.
 */

const careerScreenOfId = (id: string): CareerDestination["type"] | null =>
  ["squad", "tactics", "transfers", "league", "fixtures", "match", "seasonSummary"].includes(id)
    ? (id as CareerDestination["type"])
    : null;

/** Given the route path, derive the current screen-id (scope). */
const screenIdOfPath = (pathname: string): string => {
  const segs = pathname.split("/").filter(Boolean);
  if (segs[0] === "create") return `createStep${segs[1]?.replace("step-", "") ?? "1"}`;
  if (segs[0] === "career") return segs[2] ?? "";
  return "saveList";
};

/** The `g <key>` destination actions by completion key, from the registry. */
const G_BY_KEY: ReadonlyMap<string, Action> = new Map(
  ALL_ACTIONS.filter((a) => a.scope === "career-global" && a.binding?.startsWith("g ")).map(
    (a) => [a.binding!.slice(2).trim(), a],
  ),
);

/** One entry in the nonmodal prefix indicator. */
export interface PrefixIndicatorEntry {
  readonly label: string;
  readonly key: string;
}

/** "Go to: Squad [S] · Tactics [A] · …" — derived from the registry's g-actions. */
export const PREFIX_INDICATOR_ENTRIES: ReadonlyArray<PrefixIndicatorEntry> =
  ALL_ACTIONS.filter((a) => a.scope === "career-global" && a.binding?.startsWith("g "))
    .map((a) => ({
      label: a.label.replace(/^Go to /, ""),
      key: a.binding!.slice(2).trim().toUpperCase(),
    }))
    .sort((x, y) => x.key.localeCompare(y.key));

/** The visible nonmodal prefix feedback (AC-18): fixed below the nav bar,
 *  pointer-transparent so it never blocks interaction. */
export const PrefixIndicator = ({
  entries,
}: {
  readonly entries: ReadonlyArray<PrefixIndicatorEntry>;
}) => (
  <div
    role="status"
    aria-live="polite"
    className="pointer-events-none fixed top-14 left-2 z-50 rounded border border-amber-500/60 bg-slate-900/95 px-3 py-1.5 text-sm text-slate-200 shadow-lg"
  >
    <span className="font-semibold text-amber-300">Go to:</span>{" "}
    {entries.map((entry) => `${entry.label} [${entry.key}]`).join(" \u00b7 ")}
  </div>
);

export const KeyboardSpine = () => {
  const { pathname } = useLocation();
  const params = useParams({ strict: false });
  const decoded = decodeSaveId(params.saveId ?? "");

  const currentScreen = screenIdOfPath(pathname);
  const career = careerScreenOfId(currentScreen);
  const saveId: SaveId | undefined = decoded._tag === "Success" ? decoded.success : undefined;
  const isCareer = isCareerScreen(currentScreen as never);
  const nav = career !== null && saveId !== undefined;

  // Screens publish their availability read-model (League: phase/advancing) into
  // the shared scope state; the spine merges it over its own readiness.
  const liveScopeState = useSyncExternalStore(subscribeScopeState, getScopeState);
  const scopeState: ScopeState = useMemo(
    () => ({ ...liveScopeState, ready: isCareer }),
    [isCareer, liveScopeState],
  );
  const activeActions = useMemo(
    () => ACTION_REGISTRY.active(currentScreen as never, scopeState),
    [currentScreen, scopeState],
  );

  // Register app-global + career-global live handlers (navigation plus the
  // palette/help placeholders). The Continue (Space) handler is owned by the
  // League screen, which mounts `advanceCalendar` under its safety guard.
  useEffect(() => {
    const unregisters: Array<() => void> = [];

    unregisters.push(registerActionHandler("open-palette", () => undefined));
    unregisters.push(registerActionHandler("open-help", () => undefined));

    if (nav && saveId !== undefined) {
      const target: Record<CareerDestination["type"], () => void> = {
        squad: () => navigateCareer({ type: "squad", saveId }, "keyboard"),
        tactics: () => navigateCareer({ type: "tactics", saveId }, "keyboard"),
        transfers: () => navigateCareer({ type: "transfers", saveId }, "keyboard"),
        league: () => navigateCareer({ type: "league", saveId }, "keyboard"),
        fixtures: () => navigateCareer({ type: "fixtures", saveId }, "keyboard"),
        match: () => navigateCareer({ type: "match", saveId }, "keyboard"),
        seasonSummary: () => navigateCareer({ type: "seasonSummary", saveId }, "keyboard"),
      };
      for (const [id, type] of Object.entries({
        "go-to-squad": "squad",
        "go-to-tactics": "tactics",
        "go-to-transfers": "transfers",
        "go-to-league": "league",
        "go-to-fixtures": "fixtures",
        "go-to-match": "match",
        "go-to-season-summary": "seasonSummary",
      }) as ReadonlyArray<[string, CareerDestination["type"]]>) {
        unregisters.push(registerActionHandler(id, target[type]));
      }
      unregisters.push(registerActionHandler("go-back", () => navigateBack()));
    }

    return () => {
      for (const unregister of unregisters) unregister();
    };
  }, [nav, saveId, career]);

  // The live `g <key>` prefix lifecycle. The state machine itself is
  // `prefixReduce` (pure, unit-tested); the spine only renders the outcome.
  const [prefix, setPrefix] = useState<PrefixState>(IDLE_PREFIX);

  // ~800ms timeout auto-cancels an incomplete prefix with no further input.
  useEffect(() => {
    if (!prefix.active) return;
    const timer = setTimeout(() => setPrefix(IDLE_PREFIX), prefixTimeoutMs());
    return () => clearTimeout(timer);
  }, [prefix]);

  // ONE keystroke input: normalize, suppress-if-typing, resolve, apply.
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const keystroke = keyOf(event);
      const typing = shouldSuppressForTextEntry(event.target, keystroke);
      const now = performance.now();
      const decision = resolveDispatch({
        keystroke,
        typing,
        prefix,
        now,
        actions: activeActions,
        prefixCompletions: G_PREFIX_COMPLETIONS,
      });
      switch (decision.kind) {
        case "native":
        case "none":
          return;
        case "start-prefix":
          setPrefix({ active: true, startedAt: now });
          event.preventDefault();
          return;
        case "cancel-prefix":
          setPrefix(IDLE_PREFIX);
          event.preventDefault();
          return;
        case "complete-prefix": {
          const g = G_BY_KEY.get(decision.completion);
          if (g !== undefined) dispatchAction(g.id);
          setPrefix(IDLE_PREFIX);
          event.preventDefault();
          return;
        }
        case "action": {
          // Availability predicates are best-effort frontend optimisations, but
          // they are the LIVE contract: the dispatcher honours them, so a key
          // bound to an action that is not permitted right now does nothing.
          if (decision.action.available(scopeState)) dispatchAction(decision.action.id);
          event.preventDefault();
          return;
        }
      }
    },
    [prefix, activeActions, scopeState],
  );

  useSeamEveryKeyPress(onKeyDown, [onKeyDown]);

  return <>{prefix.active && <PrefixIndicator entries={PREFIX_INDICATOR_ENTRIES} />}</>;
};