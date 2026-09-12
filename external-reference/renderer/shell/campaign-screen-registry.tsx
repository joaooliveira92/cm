import {
  Activity,
  Coins,
  Crosshair,
  FlaskConical,
  Hammer,
  Handshake,
  LayoutDashboard,
  Map as MapIcon,
  Settings,
  Settings2,
  Ship,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, type ComponentType } from "react";
import { CampaignPreferencesScreen } from "../screens/campaign-preferences/CampaignPreferencesScreen.js";
import { ConstructionScreen } from "../screens/construction/ConstructionScreen.js";
import { FleetScreen } from "../screens/fleet/FleetScreen.js";
import { OptionsScreen } from "../screens/options/OptionsScreen.js";
import { OverviewScreen } from "../screens/overview/OverviewScreen.js";
import { useCampaignShellContext } from "./CampaignShellContext.js";
import { isDebugMode } from "./debug-mode.js";

const DebuggingScreen = lazy(() =>
  import("../screens/debugging/DebuggingScreen.js").then((module) => ({
    default: module.DebuggingScreen,
  })),
);
const SimulationScreen = lazy(() =>
  import("../screens/simulation/SimulationScreen.js").then((module) => ({
    default: module.SimulationScreen,
  })),
);
const ResearchScreen = lazy(() =>
  import("../screens/research/ResearchScreen.js").then((module) => ({
    default: module.ResearchScreen,
  })),
);
const DiplomacyScreen = lazy(() =>
  import("../screens/diplomacy/DiplomacyScreen.js").then((module) => ({
    default: module.DiplomacyScreen,
  })),
);
const TreasuryScreen = lazy(() =>
  import("../screens/treasury/TreasuryScreen.js").then((module) => ({
    default: module.TreasuryScreen,
  })),
);
const TacticalSandboxScreen = lazy(() =>
  import("../screens/tactical-sandbox/TacticalSandboxScreen.js").then((module) => ({
    default: module.TacticalSandboxScreen,
  })),
);
// PROTOTYPE — throwaway, ticket 06. Dev-only; see
// screens/map-prototype/README.md. Delete this and its folder once the
// rendering-technology question is settled.
const MapPrototypeScreen = lazy(() =>
  import("../screens/map-prototype/MapPrototypeScreen.js").then((module) => ({
    default: module.MapPrototypeScreen,
  })),
);

export type Screen =
  | "file"
  | "new-game-nation"
  | "new-game-preferences"
  | "new-game-archetype"
  | "new-game-identity"
  | "new-game-fleet-method"
  | "new-game-review"
  | "new-game-launching"
  | "opening-briefing"
  | CampaignScreen;

export type CampaignScreen =
  | "overview"
  | "construction"
  | "fleet"
  | "simulation"
  | "research"
  | "diplomacy"
  | "treasury"
  | "tactical-sandbox"
  | "debugging"
  | "map-prototype"
  | "campaign-preferences"
  | "options";

interface CampaignScreenRouteProps {
  readonly sessionId: string;
}

type CampaignScreenRoute = ComponentType<CampaignScreenRouteProps>;

export interface CampaignScreenDefinition {
  readonly id: CampaignScreen;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly group: "campaign" | "settings";
  readonly searchable: boolean;
  readonly route: CampaignScreenRoute;
}

function OverviewRoute({ sessionId }: CampaignScreenRouteProps) {
  const { actions } = useCampaignShellContext();
  return <OverviewScreen sessionId={sessionId} onNavigate={actions.selectScreen} />;
}

function ConstructionRoute({ sessionId }: CampaignScreenRouteProps) {
  return <ConstructionScreen sessionId={sessionId} />;
}

function FleetRoute({ sessionId }: CampaignScreenRouteProps) {
  return <FleetScreen sessionId={sessionId} />;
}

function SimulationRoute({ sessionId }: CampaignScreenRouteProps) {
  const { actions } = useCampaignShellContext();
  return (
    <SimulationScreen sessionId={sessionId} onPrimaryActionChange={actions.setPrimaryAction} />
  );
}

function ResearchRoute({ sessionId }: CampaignScreenRouteProps) {
  return <ResearchScreen sessionId={sessionId} />;
}

function DiplomacyRoute({ sessionId }: CampaignScreenRouteProps) {
  return <DiplomacyScreen sessionId={sessionId} />;
}

/**
 * Treasury — the read-only projection screen (INC-4). Replaces INC-14's
 * stub slot: the sidebar entry/search target were already final, only the
 * route was a placeholder.
 */
function TreasuryRoute({ sessionId }: CampaignScreenRouteProps) {
  return <TreasuryScreen sessionId={sessionId} />;
}

function TacticalSandboxRoute({ sessionId }: CampaignScreenRouteProps) {
  return <TacticalSandboxScreen sessionId={sessionId} />;
}

function DebuggingRoute({ sessionId }: CampaignScreenRouteProps) {
  return <DebuggingScreen sessionId={sessionId} />;
}

function MapPrototypeRoute() {
  return <MapPrototypeScreen />;
}

function CampaignPreferencesRoute({ sessionId }: CampaignScreenRouteProps) {
  const { actions } = useCampaignShellContext();
  return (
    <CampaignPreferencesScreen sessionId={sessionId} onCloseCampaign={actions.closeCampaign} />
  );
}

function OptionsRoute() {
  const { state, actions } = useCampaignShellContext();
  return (
    <OptionsScreen
      saving={state.saving}
      onSave={actions.saveCampaign}
      onCloseCampaign={actions.closeCampaign}
    />
  );
}

// PROTOTYPE — throwaway, ticket 06. Never registered in a production build, so
// a stray merge cannot ship a fixture world to players.
const MAP_PROTOTYPE_SCREEN: CampaignScreenDefinition = {
  id: "map-prototype",
  label: "Map Prototype",
  icon: MapIcon,
  group: "campaign",
  searchable: true,
  route: MapPrototypeRoute,
};

// Debug-only tooling, gated by the pure rule in debug-mode.ts (`isDebugMode`).
// Only set via `pnpm dev:debug` (or VITE_BLUEWAVE_DEBUG=true in a build) — a
// plain `pnpm dev` does not enable it, so these screens (and their lazy
// chunks) stay out of the sidebar unless debug mode is explicitly requested.
const DEBUG_MODE = isDebugMode({ flag: import.meta.env.VITE_BLUEWAVE_DEBUG });

const SIMULATION_SCREEN: CampaignScreenDefinition = {
  id: "simulation",
  label: "Simulation & Turn",
  icon: Activity,
  group: "campaign",
  searchable: true,
  route: SimulationRoute,
};
const TACTICAL_SANDBOX_SCREEN: CampaignScreenDefinition = {
  id: "tactical-sandbox",
  label: "Tactical Sandbox",
  icon: Crosshair,
  group: "campaign",
  searchable: true,
  route: TacticalSandboxRoute,
};
const DEBUGGING_SCREEN: CampaignScreenDefinition = {
  id: "debugging",
  label: "Debugging & Telemetry",
  icon: Terminal,
  group: "campaign",
  searchable: true,
  route: DebuggingRoute,
};

// Sixth campaign section (spec §5) — always registered, like the five real
// screens.
const TREASURY_SCREEN: CampaignScreenDefinition = {
  id: "treasury",
  label: "Treasury",
  icon: Coins,
  group: "campaign",
  searchable: true,
  route: TreasuryRoute,
};

export const CAMPAIGN_SCREEN_REGISTRY: readonly CampaignScreenDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    group: "campaign",
    searchable: true,
    route: OverviewRoute,
  },
  {
    id: "construction",
    label: "Construction",
    icon: Hammer,
    group: "campaign",
    searchable: true,
    route: ConstructionRoute,
  },
  {
    id: "fleet",
    label: "Fleet",
    icon: Ship,
    group: "campaign",
    searchable: true,
    route: FleetRoute,
  },
  ...(DEBUG_MODE ? [SIMULATION_SCREEN] : []),
  {
    id: "research",
    label: "Research & Technology",
    icon: FlaskConical,
    group: "campaign",
    searchable: true,
    route: ResearchRoute,
  },
  {
    id: "diplomacy",
    label: "Diplomacy & War",
    icon: Handshake,
    group: "campaign",
    searchable: true,
    route: DiplomacyRoute,
  },
  TREASURY_SCREEN,
  ...(DEBUG_MODE ? [TACTICAL_SANDBOX_SCREEN, DEBUGGING_SCREEN] : []),
  ...(import.meta.env.DEV ? [MAP_PROTOTYPE_SCREEN] : []),
  {
    id: "campaign-preferences",
    label: "Campaign Preferences",
    icon: Settings2,
    group: "settings",
    searchable: false,
    route: CampaignPreferencesRoute,
  },
  {
    id: "options",
    label: "Options",
    icon: Settings,
    group: "settings",
    searchable: false,
    route: OptionsRoute,
  },
];

export const CAMPAIGN_SCREENS = CAMPAIGN_SCREEN_REGISTRY.filter(
  (screen) => screen.group === "campaign",
);
export const SETTINGS_SCREENS = CAMPAIGN_SCREEN_REGISTRY.filter(
  (screen) => screen.group === "settings",
);
export const CAMPAIGN_SCREEN_SEARCH_TARGETS = CAMPAIGN_SCREEN_REGISTRY.filter(
  (screen) => screen.searchable,
).map(({ id, label }) => ({ id, label }));

const CAMPAIGN_SCREEN_ROUTES = new Map(
  CAMPAIGN_SCREEN_REGISTRY.map(({ id, route }) => [id, route]),
);

export interface CampaignScreenOutletProps {
  readonly screen: Screen;
}

export function CampaignScreenOutlet({ screen }: CampaignScreenOutletProps) {
  const { state } = useCampaignShellContext();
  if (state.mode.kind !== "campaign") return null;
  const Route = CAMPAIGN_SCREEN_ROUTES.get(screen as CampaignScreen);
  if (Route === undefined) return null;
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading screen…</div>}>
      <Route sessionId={state.mode.campaign.sessionId} />
    </Suspense>
  );
}
