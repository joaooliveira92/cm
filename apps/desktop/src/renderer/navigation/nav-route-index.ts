import type { CareerDestination } from "./destinations.js";
import { NAV_SECTIONS, type NavSectionId } from "./nav-config.js";

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

for (const section of NAV_SECTIONS) {
  // Register the section's default destination
  const existing = destinationToSection.get(section.defaultDestination);
  if (existing === undefined) {
    destinationToSection.set(section.defaultDestination, {
      sectionId: section.id,
      defaultDestination: section.defaultDestination,
    });
  }

  // Register each item's destination (may map to a different section than the
  // default if an item routes to a destination that belongs to another section's
  // default, e.g. Training items routing to Squad).
  for (const item of section.items) {
    const entry = destinationToSection.get(item.destination);
    if (entry === undefined) {
      destinationToSection.set(item.destination, {
        sectionId: section.id,
        defaultDestination: section.defaultDestination,
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
