import type { CareerDestination } from "./destinations.js";
import { NAV_SECTIONS, type NavItem, type NavSection, type NavSectionId } from "./nav-config.js";

/**
 * Route-to-section index: given a career destination type, return the section
 * that owns it and the default route for that section. Prebuilt once at module
 * load — O(1) lookup, no allocation per navigation.
 */

interface SectionEntry {
  readonly sectionId: NavSectionId;
  readonly defaultDestination: CareerDestination["type"];
}

const destinationToSection = new Map<CareerDestination["type"], SectionEntry>();

// Pass 1 — every section default, first-wins: a destination is owned by the section that
// defaults to it, even when an earlier section lists it as an item cross-link.
for (const section of NAV_SECTIONS) {
  const existing = destinationToSection.get(section.defaultDestination);
  if (existing === undefined) {
    destinationToSection.set(section.defaultDestination, {
      sectionId: section.id,
      defaultDestination: section.defaultDestination,
    });
  }
}

// Pass 2 — items, scanned in reverse section order (first-wins): a destination that no section
// defaults to is owned by the LAST section to list it. Squad's club menu cross-links Fixtures,
// Transfers, Last Match, and Serie A into Analysis and Recruitment; a forward scan would let the
// first section to list them (Squad) re-home the screens and strip the owner's highlight on
// arrival. Reverse order keeps the native section's claim — Analysis before Squad — while still
// letting genuinely new item destinations (e.g. Training routing to Squad) be claimed.
for (let i = NAV_SECTIONS.length - 1; i >= 0; i--) {
  for (const item of NAV_SECTIONS[i]!.items) {
    const entry = destinationToSection.get(item.destination);
    if (entry === undefined) {
      destinationToSection.set(item.destination, {
        sectionId: NAV_SECTIONS[i]!.id,
        defaultDestination: NAV_SECTIONS[i]!.defaultDestination,
      });
    }
  }
}

/**
 * Resolve a career destination type to its owning section. Returns `undefined`
 * for destinations that have no section (shouldn't happen for career routes,
 * but defensively typed).
 */
export const sectionForDestination = (
  destination: CareerDestination["type"],
): SectionEntry | undefined => destinationToSection.get(destination);

/**
 * Get the section ID that owns a given career destination type.
 */
export const sectionIdForDestination = (
  destination: CareerDestination["type"],
): NavSectionId | undefined => sectionForDestination(destination)?.sectionId;

/**
 * Whether a section's own button carries the `g <key>` hint for its default destination. Only the
 * owning section does: Training defaults to Squad as a placeholder, and a hint there would tell the
 * player that `g s` opens Training.
 */
export const sectionCarriesHint = (section: NavSection): boolean =>
  sectionIdForDestination(section.defaultDestination) === section.id;

/**
 * Whether a strip item carries its destination's `g <key>` hint. Together with `sectionCarriesHint`
 * this puts every key on exactly one control: the section button already shows its default
 * destination, cross-links (Squad's Fixtures, Last Match) defer to the owning section, and repeated
 * placeholders (Squad's Staff, Finances, History) defer to the first item that lists the destination.
 */
export const itemCarriesHint = (section: NavSection, item: NavItem): boolean =>
  item.destination !== section.defaultDestination &&
  sectionIdForDestination(item.destination) === section.id &&
  section.items.find((candidate) => candidate.destination === item.destination) === item;
