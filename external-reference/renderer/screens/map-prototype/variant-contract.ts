/**
 * PROTOTYPE — throwaway. See ./README.md.
 *
 * What the host hands every variant. Data only: no layout, no chrome, no
 * shared wrapper. A variant is free to throw out the whole page.
 */

import type { ProjectionId } from "./prototype-projection.js";
import type { LayerId, MapPrototypeState, RouteReading } from "./map-prototype-screen-state.js";
import type { AreaId } from "./prototype-world.js";

export interface MapVariantProps {
  readonly state: MapPrototypeState;
  readonly route: RouteReading | null;
  readonly onSelect: (area: AreaId | null) => void;
  readonly onRuler: (area: AreaId) => void;
  readonly onToggleLayer: (layer: LayerId) => void;
  readonly onSetProjection: (projection: ProjectionId) => void;
  readonly onSetCentre: (centre: number) => void;
  readonly onToggleClosedPassages: () => void;
}

export interface VariantDefinition {
  readonly key: string;
  readonly name: string;
  readonly premise: string;
  readonly Component: React.ComponentType<MapVariantProps>;
}
