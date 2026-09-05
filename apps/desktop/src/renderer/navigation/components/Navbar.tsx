import type { ClubColoursView, SaveId } from "@cm-clone/contracts";
import { useLocation } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef } from "react";
import { navigateCareer } from "../../navigation/adapter.js";
import type { CareerDestination } from "../../navigation/destinations.js";
import type { NavigationIntent } from "../../focus.js";
import { NAV_SECTIONS, type NavSectionId } from "../../navigation/nav-config.js";
import { sectionIdForDestination } from "../../navigation/nav-route-index.js";
import { useNavState } from "../../navigation/use-nav-state.js";
import { AppTitleBar } from "../../chrome/header/AppTitleBar.js";
import { clubHeaderStyle } from "../../chrome/header/club-scheme.js";
import { NO_DRAG } from "../../chrome/header/drag-region.js";
import { ContextNav } from "./ContextNav.js";
import { PrimaryNavItem } from "./PrimaryNavItem.js";

/**
 * Hover-intent and close-tolerance timings (spec §5.1): opening a preview is
 * delayed so crossing the bar doesn't flash menus; leaving both the trigger and
 * its submenu is tolerated for a beat so diagonal movement stays open.
 */
const INTENT_DELAY_MS = 170;
const CLOSE_TOLERANCE_MS = 300;

const routeChildToDestination: Readonly<Record<string, CareerDestination["type"]>> = {
  squad: "squad",
  tactics: "tactics",
  transfers: "transfers",
  league: "league",
  fixtures: "fixtures",
  match: "match",
  "season-summary": "seasonSummary",
  manager: "manager",
};

/**
 * The redesigned navbar: a horizontal three-zone bar replacing the vertical
 * tab strip, implementing the interaction model from the redesigned-navbar spec.
 *
 * - Left zone: identity (club name) and history controls.
 * - Center zone: the primary sections, each opening a context submenu strip.
 * - Right zone: the Continue action and profile / back-to-saves.
 *
 * The identity band and the adaptive row beneath it paint in the user club's primary colours; the
 * section nav and context strip stay on the neutral surface (see the note at the nav element).
 *
 * The primary row hosts the section items; the context strip below it shows the
 * active (or hover-previewed) section's items. Hover preview never changes the
 * active route (spec §6 rule 4): it only swaps which section's items the strip
 * displays, while the active indicator stays on the route's section.
 */
export const Navbar = ({
  saveId,
  clubName,
  clubColours = null,
  badges,
  leading,
  secondary,
  actions,
}: {
  readonly saveId: SaveId;
  readonly clubName: string | null;
  /** The club's scheme. Null until the profile read lands — the header then paints in the neutral
   *  chrome, which is the same thing every pre-career shell shows, not a flash of wrong colour. */
  readonly clubColours?: ClubColoursView | null;
  /** Unanswered work per section id. The navbar owns none of these numbers — it renders whichever
   *  the chrome supplies, so a future section can carry one without this component changing. */
  readonly badges?: Readonly<Record<string, { readonly count: number; readonly label: string }>>;
  /** Left-zone controls preceding the identity (the history cluster). */
  readonly leading?: ReactNode;
  /** The adaptive band under the identity row — the header's described state. */
  readonly secondary?: ReactNode;
  /** Right-zone controls (back-to-saves, Continue, profile) composed by the caller. */
  readonly actions?: ReactNode;
}) => {
  const location = useLocation();
  const activeChild = location.pathname.split("/").at(-1) ?? "";

  // Derive the current section/item from the route (spec §6 rule 1: the route is
  // the source of truth for the active section/item).
  const activeDestination = routeChildToDestination[activeChild] ?? null;
  const activeSectionId = activeDestination
    ? sectionIdForDestination(activeDestination) ?? null
    : null;

  // Find the active item: the item in the active section whose destination
  // matches the current route.
  const activeItemId = findActiveItemId(activeDestination, activeSectionId);

  const { setPreview, setOpen, clearTransient, isSubmenuVisible } =
    useNavState(activeSectionId);

  // Hover-intent timers, keyed by the target section. A single pending preview
  // plus per-section timers so crossing the bar only ever opens one strip.
  const intentTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  // Clear pending timers on unmount so a navigated-away navbar never fires a
  // late preview into the next screen.
  useEffect(() => {
    return () => {
      if (intentTimer.current !== null) window.clearTimeout(intentTimer.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, []);

  // The section whose items the context strip shows: the previewed/open section
  // if any (transient), otherwise the active section (persistent contextual
  // strip, spec §4). The active indicator stays on the route's section
  // regardless of what the strip displays.
  const previewedOrOpen =
    NAV_SECTIONS.find((s) => isSubmenuVisible(s.id)) ?? null;
  const stripSection =
    previewedOrOpen ??
    (activeSectionId !== null
      ? (NAV_SECTIONS.find((s) => s.id === activeSectionId) ?? null)
      : null);

  const handleSectionEnter = (sectionId: NavSectionId) => {
    // Entering cancels any pending close (re-entering the strip stays open).
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    // If already showing a section, swap instantly; otherwise start the intent
    // delay so crossing the bar doesn't flash.
    if (isSubmenuVisible(sectionId)) {
      if (intentTimer.current !== null) {
        window.clearTimeout(intentTimer.current);
        intentTimer.current = null;
      }
      return;
    }
    if (intentTimer.current !== null) window.clearTimeout(intentTimer.current);
    intentTimer.current = window.setTimeout(() => {
      intentTimer.current = null;
      setPreview(sectionId);
    }, INTENT_DELAY_MS);
  };

  const handleSectionLeave = () => {
    if (intentTimer.current !== null) {
      window.clearTimeout(intentTimer.current);
      intentTimer.current = null;
    }
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    // Tolerate leaving the trigger/submenu briefly before closing the preview.
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setPreview(null);
    }, CLOSE_TOLERANCE_MS);
  };

  // The intent comes from the event, never a constant: Enter on a focused nav item must focus the
  // destination (AC-15), and hardcoding "pointer" here made every keyboard navigation leave focus
  // stranded on the navbar.
  const goTo = (destination: CareerDestination["type"], intent: NavigationIntent) => {
    clearTransient();
    navigateCareer({ type: destination, saveId }, intent);
  };

  const handleToggleSubmenu = (sectionId: NavSectionId) => {
    setOpen((current) => (current === sectionId ? null : sectionId));
  };

  return (
    // The club scope. The two inline properties are the club's primary pair; `club-header` derives
    // the rest from them here, so the bands below inherit a complete scheme. With no club it
    // carries no inline style and every role falls back to the neutral chrome.
    <header className="club-header text-header-fg" style={clubHeaderStyle(clubColours)}>
      {/* Left + right zones share the first row band, which is also the
          window's drag handle and the macOS traffic-light inset. */}
      <AppTitleBar
        title={clubName ?? ""}
        leading={leading}
        identity={
          <span className="truncate text-lg font-bold">{clubName ?? "\u00a0"}</span>
        }
        actions={actions}
      />

      {/* The adaptive band: the header's described state, never a second source
          of truth for it. See `chrome/header/career-header-state.ts`. */}
      {secondary !== undefined && (
        <div
          className="flex h-7 w-full items-center border-b border-header-border bg-header-bg px-3"
          style={NO_DRAG}
        >
          {secondary}
        </div>
      )}

      {/* Center zone: primary sections. Deliberately NOT club-coloured: the section items carry
          their own active/hover chrome, and painting them over an arbitrary club background is
          what turns a legible nav into an unreadable one. The club identity is the band above. */}
      <nav
        className="flex items-center gap-1 overflow-x-auto border-b border-border-subtle bg-bg-raised px-2 py-1 text-text-primary"
        aria-label="Primary navigation"
      >
        {NAV_SECTIONS.map((section) => (
          <PrimaryNavItem
            key={section.id}
            section={section}
            active={section.id === activeSectionId}
            badgeCount={badges?.[section.id]?.count}
            badgeLabel={badges?.[section.id]?.label}
            submenuOpen={isSubmenuVisible(section.id)}
            children={section.items}
            onNavigate={(intent) => goTo(section.defaultDestination, intent)}
            onToggleSubmenu={() => handleToggleSubmenu(section.id)}
            onMouseEnter={() => handleSectionEnter(section.id)}
            onMouseLeave={handleSectionLeave}
          />
        ))}
      </nav>

      {/* Context submenu strip: active or previewed section's items */}
      <ContextNav
        section={stripSection}
        items={stripSection?.items ?? []}
        activeItemId={activeItemId}
        onNavigate={goTo}
        onMouseEnter={() => {
          if (stripSection !== null) handleSectionEnter(stripSection.id);
        }}
        onMouseLeave={handleSectionLeave}
      />
    </header>
  );
};

const findActiveItemId = (
  destination: CareerDestination["type"] | null,
  activeSectionId: NavSectionId | null,
): string | null => {
  if (destination === null || activeSectionId === null) return null;
  const section = NAV_SECTIONS.find((s) => s.id === activeSectionId);
  if (section === undefined) return null;
  return section.items.find((item) => item.destination === destination)?.id ?? null;
};
