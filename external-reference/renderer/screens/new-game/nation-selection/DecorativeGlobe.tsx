import type { JSX } from "react";

import { GlobeShell } from "./GlobeShell.js";
import { useSvgGlobe } from "./useSvgGlobe.js";

// The menu/launch backdrop globe — a spinning sphere with zero pointer
// interaction. Identical output to the old decorative mode: no pins, no
// selection ring, no drag/zoom/click.
export function DecorativeGlobe(): JSX.Element {
  const globe = useSvgGlobe();
  return <GlobeShell refs={globe} />;
}
