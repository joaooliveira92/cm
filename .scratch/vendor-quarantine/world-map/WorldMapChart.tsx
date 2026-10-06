/**
 * The Admiralty-chart world map — real coastlines, areas as translucent
 * ownership washes over them, its own chart palette independent of the app
 * theme (the way a paper chart would be).
 *
 * Promoted out of `screens/map-prototype/variants/VariantAChart.tsx` (ticket
 * 06's three-way comparison) once "Admiralty chart" was chosen as the design.
 * The world fixture, projection math, coastline geometry, and camera hook it
 * depends on still live under `screens/map-prototype/` because variants B and
 * C — kept deliberately, see that folder's README — still use them; this
 * component is the one consumer of that data that is not itself throwaway.
 */

import { useMemo } from "react";
import { Button } from "../ui/button.js";
import {
  AREAS,
  AREAS_BY_ID,
  EDGES,
  FLEETS,
  PASSAGES_BY_ID,
  POSSESSIONS,
} from "../../screens/map-prototype/prototype-world.js";
import { COASTLINE_POLYGONS } from "../../screens/map-prototype/prototype-coastline.js";
import {
  PROJECTIONS,
  projectAreas,
  projectPoint,
  projectionById,
  ringToPath,
  WORLD_WRAP_TURNS,
  type Point,
} from "../../screens/map-prototype/prototype-projection.js";
import {
  LAYERS,
  areaControl,
  nationFill,
  nationName,
  nationStroke,
  summariseArea,
} from "../../screens/map-prototype/map-prototype-screen-state.js";
import {
  EMPTY_LIVE_OVERLAY,
  campaignNationHue,
  campaignNationLabel,
  fixtureAnchor,
  type LiveWorldMapOverlay,
} from "../../screens/map-prototype/campaign-map-join.js";
import { usePrototypeCamera } from "../../screens/map-prototype/usePrototypeCamera.js";
import type { MapVariantProps } from "../../screens/map-prototype/variant-contract.js";
import { cn } from "../../lib/utils.js";

const CHART = {
  ocean: "oklch(0.19 0.035 245)",
  oceanDeep: "oklch(0.15 0.03 248)",
  land: "oklch(0.30 0.018 250)",
  landEdge: "oklch(0.42 0.02 250)",
  graticule: "oklch(0.30 0.02 245)",
  ink: "oklch(0.92 0.01 240)",
  inkDim: "oklch(0.70 0.015 240)",
};

export interface WorldMapChartProps extends MapVariantProps {
  readonly className?: string;
  /** Optional live campaign overlay; defaults to the static prototype fixture. */
  readonly overlay?: LiveWorldMapOverlay;
}

export function WorldMapChart({
  state,
  route,
  onSelect,
  onRuler,
  onToggleLayer,
  onSetProjection,
  onSetCentre,
  onToggleClosedPassages,
  overlay = EMPTY_LIVE_OVERLAY,
  className,
}: WorldMapChartProps) {
  const projection = projectionById(state.projection);
  const camera = usePrototypeCamera(projection.width, projection.height);
  const live = overlay.source === "campaign";

  /** Ownership: live overlay overrides the fixture wherever the campaign maps one. */
  const control = useMemo(() => {
    const merged = new Map(areaControl());
    if (!live) return merged;
    for (const [area, owner] of overlay.ownership) {
      merged.set(area, {
        owner,
        contested: false,
        possessions: 0,
      });
    }
    return merged;
  }, [live, overlay]);

  /** The possessions/ports to draw: live campaign ports when active, else fixture. */
  const drawnPorts = useMemo(() => {
    if (!live) return POSSESSIONS;
    return overlay.ports
      .map((port) => {
        const at = fixtureAnchor(port.area);
        if (at === null) return null;
        return {
          id: port.id,
          name: port.name,
          at,
          owner: port.nation,
          base: (port.level >= 7 ? "major" : "minor") as "major" | "minor",
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [live, overlay]);

  /** The fleets to draw: live campaign fleets when active, else fixture. */
  const drawnFleets = useMemo(() => {
    if (!live) return FLEETS;
    return overlay.fleets
      .map((fleet) => {
        const anchor = fixtureAnchor(fleet.area);
        if (anchor === null) return null;
        return {
          id: fleet.id,
          name: fleet.name,
          area: fleet.area,
          owner: fleet.nation,
          ships: fleet.ships,
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);
  }, [live, overlay]);

  const coastline = useMemo(
    () =>
      COASTLINE_POLYGONS.map((rings) =>
        rings
          .map((flat) => {
            const ring: Point[] = [];
            for (let i = 0; i < flat.length; i += 2) {
              ring.push([(flat[i] as number) - state.centre, flat[i + 1] as number]);
            }
            return ringToPath(ring, projection);
          })
          .join(""),
      ),
    [projection, state.centre],
  );

  const areas = useMemo(
    () => projectAreas(AREAS, projection, state.centre),
    [projection, state.centre],
  );
  const areasById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);

  const graticule = useMemo(() => {
    const lines: string[] = [];
    for (let lat = -60; lat <= 60; lat += 30) {
      const [x1, y] = projection.project(0, lat);
      lines.push(`M${-projection.width} ${y}L${projection.width * 2} ${y}`);
      void x1;
    }
    for (let lon = -180; lon < 180; lon += 30) {
      const [x] = projection.project(lon, 0);
      lines.push(`M${x} 0L${x} ${projection.height}`);
    }
    return lines.join("");
  }, [projection]);

  const routeSet = new Set(route?.path ?? []);

  /** Selected-area inspector: live overlay data when active, else the fixture. */
  const summary = useMemo(() => {
    if (state.selected === null) return null;
    const fixture = summariseArea(state.selected);
    if (fixture === null) return null;
    if (!live) return fixture;

    const owner = overlay.ownership.get(state.selected) ?? null;
    const ports = overlay.ports.filter((p) => p.area === state.selected);
    const fleets = overlay.fleets.filter((f) => f.area === state.selected);
    return {
      id: state.selected,
      name: fixture.name,
      control: { owner, contested: false, possessions: 0 },
      possessions: ports.map((p) => ({ id: p.id, name: p.name, owner: p.nation })),
      fleets: fleets.map((f) => ({ id: f.id, name: f.name, owner: f.nation, ships: f.ships })),
      neighbours: fixture.neighbours,
    };
  }, [live, overlay, state.selected]);

  /** Colour a nation (campaign id or fixture id) for the wash. */
  function fillFor(nation: string | null, alpha: number): string {
    if (nation === null) return `oklch(0.55 0 0 / ${alpha * 0.35})`;
    if (live) return `oklch(0.66 0.15 ${campaignNationHue(nation)} / ${alpha})`;
    return nationFill(nation, alpha);
  }

  /** Colour a nation's marker stroke (campaign id or fixture id). */
  function strokeFor(nation: string): string {
    if (live) return `oklch(0.74 0.17 ${campaignNationHue(nation)})`;
    return nationStroke(nation);
  }

  /** Display name for a nation (campaign id or fixture id). */
  function nameFor(nation: string | null): string {
    if (nation === null) return "Unclaimed";
    if (live) return campaignNationLabel(nation);
    return nationName(nation);
  }

  const routePath = useMemo(() => {
    if (route === null || !state.layers.routes) return "";
    return route.path
      .map((id, index) => {
        const point = areasById.get(id)?.label;
        if (point === undefined) return "";
        return `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`;
      })
      .join("");
  }, [areasById, route, state.layers.routes]);

  function handleAreaClick(id: string, shiftKey: boolean) {
    if (camera.isDraggingRef.current) return;
    if (shiftKey) onRuler(id);
    else onSelect(id);
  }

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border shadow-sm",
        className,
      )}
      style={{ background: CHART.ocean }}
    >
      <svg
        ref={camera.svgRef}
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        viewBox={`0 0 ${projection.width} ${projection.height}`}
        preserveAspectRatio="xMidYMid meet"
        role="application"
        aria-label="World map"
      >
        <defs>
          <radialGradient id="chart-vignette" cx="50%" cy="45%" r="75%">
            <stop offset="60%" stopColor={CHART.ocean} />
            <stop offset="100%" stopColor={CHART.oceanDeep} />
          </radialGradient>
        </defs>
        <rect
          x={-projection.width}
          y={-projection.height}
          width={projection.width * 4}
          height={projection.height * 4}
          fill="url(#chart-vignette)"
        />
        <g ref={camera.worldRef}>
          {/* Every layer, three times: one turn west, home, one turn east.
              That is the entire antimeridian strategy — no clipping, no ring
              splitting, and markers wrap with the polygons they belong to. */}
          {WORLD_WRAP_TURNS.map((turn) => (
            <g key={turn} transform={`translate(${turn * projection.width} 0)`}>
              <path d={graticule} stroke={CHART.graticule} strokeWidth={1} fill="none" />

              {/* Layer: base map. One path per landmass. */}
              {coastline.map((d, index) => (
                <path
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  d={d}
                  fill={CHART.land}
                  fillRule="evenodd"
                  stroke={CHART.landEdge}
                  strokeWidth={0.8}
                />
              ))}

              {/* Layer: areas + ownership wash. */}
              {areas.map((area) => {
                const held = control.get(area.id);
                const selected = state.selected === area.id;
                const onRouteLeg = routeSet.has(area.id);
                return (
                  <path
                    key={area.id}
                    d={area.path}
                    fill={
                      state.layers.ownership
                        ? fillFor(held?.owner ?? null, selected ? 0.42 : 0.2)
                        : selected
                          ? "oklch(0.7 0.02 240 / 0.25)"
                          : "oklch(0.7 0.02 240 / 0.06)"
                    }
                    stroke={
                      selected
                        ? CHART.ink
                        : onRouteLeg
                          ? "oklch(0.85 0.16 85)"
                          : "oklch(0.75 0.02 240 / 0.35)"
                    }
                    strokeWidth={selected ? 2.5 : onRouteLeg ? 2 : 0.9}
                    strokeDasharray={held?.contested === true ? "6 4" : undefined}
                    className="cursor-pointer transition-[fill] duration-150"
                    onClick={(event) => handleAreaClick(area.id, event.shiftKey)}
                  />
                );
              })}

              {/* Layer: routes. */}
              {routePath !== "" && (
                <>
                  <path
                    d={routePath}
                    fill="none"
                    stroke="oklch(0.2 0 0 / 0.6)"
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <path
                    d={routePath}
                    fill="none"
                    stroke="oklch(0.85 0.16 85)"
                    strokeWidth={2.5}
                    strokeDasharray="10 6"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Layer: passages. Drawn at the midpoint of the edge they gate. */}
              {state.layers.passages &&
                EDGES.filter((edge) => edge.passage !== undefined).map((edge) => {
                  const from = areasById.get(edge.a)?.label;
                  const to = areasById.get(edge.b)?.label;
                  const passage = PASSAGES_BY_ID.get(edge.passage as string);
                  if (from === undefined || to === undefined || passage === undefined) return null;
                  const mx = (from[0] + to[0]) / 2;
                  const my = (from[1] + to[1]) / 2;
                  return (
                    <g key={passage.id}>
                      <line
                        x1={from[0]}
                        y1={from[1]}
                        x2={to[0]}
                        y2={to[1]}
                        stroke={
                          passage.open ? "oklch(0.75 0.02 240 / 0.3)" : "oklch(0.65 0.2 25 / 0.55)"
                        }
                        strokeWidth={1.5}
                        strokeDasharray={passage.open ? undefined : "5 4"}
                      />
                      <circle
                        cx={mx}
                        cy={my}
                        r={7}
                        fill={passage.open ? "oklch(0.28 0.03 245)" : "oklch(0.36 0.11 25)"}
                        stroke={passage.open ? "oklch(0.8 0.02 240)" : "oklch(0.72 0.2 25)"}
                        strokeWidth={1.6}
                      />
                      <text
                        x={mx}
                        y={my + 3.2}
                        textAnchor="middle"
                        fontSize={9}
                        fill={CHART.ink}
                        style={{ pointerEvents: "none" }}
                      >
                        {passage.kind === "canal" ? "C" : "S"}
                      </text>
                    </g>
                  );
                })}

              {/* Layer: possessions. */}
              {state.layers.possessions &&
                drawnPorts.map((possession) => {
                  const [x, y] = projectPoint(possession.at, projection, state.centre);
                  const major = possession.base === "major";
                  return (
                    <g key={possession.id}>
                      <circle
                        cx={x}
                        cy={y}
                        r={major ? 5 : 3.5}
                        fill={strokeFor(possession.owner)}
                        stroke="oklch(0.15 0.02 245)"
                        strokeWidth={1.4}
                      />
                      {camera.zoomBand >= 2 && (
                        <text
                          x={x + 8}
                          y={y + 3}
                          fontSize={9}
                          fill={CHART.inkDim}
                          style={{ pointerEvents: "none" }}
                        >
                          {possession.name}
                        </text>
                      )}
                    </g>
                  );
                })}

              {/* Layer: fleets. */}
              {state.layers.fleets &&
                drawnFleets.map((fleet, index) => {
                  const anchor = areasById.get(fleet.area)?.label;
                  if (anchor === undefined) return null;
                  const offset = (index % 3) * 16 - 16;
                  return (
                    <g
                      key={fleet.id}
                      transform={`translate(${anchor[0] + offset} ${anchor[1] + 18})`}
                    >
                      <rect
                        x={-11}
                        y={-8}
                        width={22}
                        height={16}
                        rx={3}
                        fill={strokeFor(fleet.owner)}
                        stroke="oklch(0.15 0.02 245)"
                        strokeWidth={1.4}
                      />
                      <text
                        y={4}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        fill="oklch(0.15 0.02 245)"
                        style={{ pointerEvents: "none" }}
                      >
                        {fleet.ships}
                      </text>
                    </g>
                  );
                })}

              {/* Layer: labels. Hand-placed anchors, thinned by zoom band. */}
              {state.layers.labels &&
                areas.map((area) => {
                  const definition = AREAS_BY_ID.get(area.id);
                  if (definition === undefined) return null;
                  const big = area.bounds.width * area.bounds.height > 26000;
                  if (camera.zoomBand === 0 && !big) return null;
                  return (
                    <text
                      key={area.id}
                      x={area.label[0]}
                      y={area.label[1]}
                      textAnchor="middle"
                      fontSize={big ? 15 : 12}
                      letterSpacing={1.2}
                      fill={CHART.ink}
                      stroke="oklch(0.15 0.02 245)"
                      strokeWidth={3}
                      paintOrder="stroke"
                      style={{
                        pointerEvents: "none",
                        textTransform: "uppercase",
                      }}
                    >
                      {definition.name}
                    </text>
                  );
                })}
            </g>
          ))}
        </g>
      </svg>

      {/* Chrome: a floating toolbar, chart-styled rather than app-styled — a
          deliberate choice, so the chart reads as a chart rather than another
          panel of the shell. */}
      <div
        className="absolute left-3 top-3 flex flex-col gap-2 rounded-lg border p-2.5 text-xs shadow-lg backdrop-blur"
        style={{
          background: "oklch(0.16 0.025 245 / 0.85)",
          borderColor: "oklch(0.4 0.02 245)",
          color: CHART.ink,
        }}
      >
        <div className="flex gap-1">
          {PROJECTIONS.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSetProjection(option.id)}
              title={option.note}
              className="h-7 px-2 text-[11px] hover:bg-white/10"
              style={{
                background: state.projection === option.id ? "oklch(0.7 0.12 240)" : "transparent",
                color: state.projection === option.id ? "oklch(0.15 0.02 245)" : CHART.inkDim,
              }}
            >
              {option.name}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1" style={{ maxWidth: 220 }}>
          {LAYERS.map((layer) => (
            <Button
              key={layer.id}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onToggleLayer(layer.id)}
              className="h-7 border px-2 text-[11px] hover:bg-white/10"
              style={{
                background: state.layers[layer.id] ? "oklch(0.35 0.03 245)" : "transparent",
                color: state.layers[layer.id] ? CHART.ink : CHART.inkDim,
                borderColor: "oklch(0.4 0.02 245)",
              }}
            >
              {layer.label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11px]" style={{ color: CHART.inkDim }}>
          Centre
          <input
            type="range"
            min={-180}
            max={180}
            step={10}
            value={state.centre}
            onChange={(event) => onSetCentre(Number(event.target.value))}
            className="w-28"
          />
          <span className="tabular-nums">{state.centre}°</span>
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={camera.reset}
            className="h-7 border px-2 text-[11px] hover:bg-white/10"
            style={{ borderColor: "oklch(0.4 0.02 245)", color: CHART.inkDim }}
          >
            Reset view
          </Button>
          <span
            ref={camera.meterRef}
            className="font-mono text-[10px] tabular-nums"
            style={{ color: CHART.inkDim }}
          />
        </div>
      </div>

      {/* Chrome: inspector floats over the chart rather than taking layout. */}
      <div
        className="absolute right-3 top-3 w-72 rounded-lg border p-3 text-xs shadow-lg backdrop-blur"
        style={{
          background: "oklch(0.16 0.025 245 / 0.9)",
          borderColor: "oklch(0.4 0.02 245)",
          color: CHART.ink,
        }}
      >
        {summary === null ? (
          <p style={{ color: CHART.inkDim }}>
            Click an area to inspect. Shift-click two areas to lay the ruler.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium tracking-wide uppercase">{summary.name}</span>
              <button
                type="button"
                onClick={() => onSelect(null)}
                className="leading-none opacity-70 transition-opacity hover:opacity-100"
                style={{ color: CHART.inkDim }}
                aria-label="Clear selection"
              >
                ×
              </button>
            </div>
            <div style={{ color: CHART.inkDim }}>
              {nameFor(summary.control.owner)}
              {summary.control.contested ? " · contested" : ""} · {summary.possessions.length}{" "}
              possessions · {summary.fleets.length} fleets
            </div>
            {summary.fleets.length > 0 && (
              <ul className="m-0 list-none p-0">
                {summary.fleets.map((fleet) => (
                  <li key={fleet.id} className="flex justify-between">
                    <span>{fleet.name}</span>
                    <span className="tabular-nums" style={{ color: CHART.inkDim }}>
                      {fleet.ships}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ color: CHART.inkDim }}>Adjacent</div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {summary.neighbours.map((neighbour) => (
                <li key={neighbour.id}>
                  <button
                    type="button"
                    className="w-full text-left transition-opacity hover:opacity-80"
                    onClick={() => onSelect(neighbour.id)}
                  >
                    {neighbour.name}
                    {neighbour.passage !== null && (
                      <span
                        style={{
                          color: neighbour.open ? CHART.inkDim : "oklch(0.72 0.2 25)",
                        }}
                      >
                        {" "}
                        via {neighbour.passage}
                        {neighbour.open ? "" : " (closed)"}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Chrome: the ruler readout. */}
      <div
        className="absolute bottom-3 left-3 rounded-lg border px-3 py-2 text-xs shadow-lg backdrop-blur"
        style={{
          background: "oklch(0.16 0.025 245 / 0.9)",
          borderColor: "oklch(0.4 0.02 245)",
          color: CHART.ink,
        }}
      >
        {route === null ? (
          <span style={{ color: CHART.inkDim }}>Shift-click two areas for a route reading</span>
        ) : (
          <div className="flex items-center gap-4">
            <span>
              <strong className="tabular-nums">{route.hops}</strong> hops
            </span>
            <span className="tabular-nums" style={{ color: CHART.inkDim }}>
              {route.nauticalMiles.toLocaleString()} nm
            </span>
            <span className="tabular-nums" style={{ color: CHART.inkDim }}>
              {route.perHop.toLocaleString()} nm/hop
            </span>
            <span className="tabular-nums" style={{ color: CHART.inkDim }}>
              ≈{route.months} months
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onToggleClosedPassages}
              className="h-6 border px-2 text-[11px] hover:bg-white/10"
              style={{ borderColor: "oklch(0.4 0.02 245)", color: CHART.ink }}
            >
              {state.respectClosedPassages ? "avoiding closures" : "ignoring closures"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
