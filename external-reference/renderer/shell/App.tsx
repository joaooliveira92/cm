import { defaultArchetypeSelection, type ArchetypeSelection } from "@bluewave/campaign-engine";
import { useEffect, useMemo, useState } from "react";
import type { BluewaveDesktopBridge } from "../../preload/index.js";
import type { WindowState } from "../../shared/bridge-contract.js";
import type { BridgeResult } from "../../shared/bridge-contract.js";
import type { InspectOpeningBriefingResult } from "../../shared/campaign-command-contract.js";
import type { NewGameOptions } from "../../shared/new-game-contract.js";
import Auralis from "../components/backgrounds/auralis.js";
import Nebulore from "../components/backgrounds/nebulore.js";
import { StarsBackground } from "../components/backgrounds/starts.js";
import { ShaderBackground } from "../components/motion/shader-background.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { SidebarInset, SidebarProvider } from "../components/ui/sidebar.js";
import {
  MonthlyResolutionFailure,
  MonthlyResolutionLoading,
} from "../components/MonthlyResolutionLoading.js";
import { PreTurnReviewDialog } from "../components/PreTurnReviewDialog.js";
import { CampaignFileScreen } from "../screens/campaign-file/CampaignFileScreen.js";
import { CampaignListScreen } from "../screens/campaign-list/CampaignListScreen.js";
import { NewGameArchetypeScreen } from "../screens/new-game/NewGameArchetypeScreen.js";
import { NewGameBriefingScreen } from "../screens/new-game/NewGameBriefingScreen.js";
import { NewGameCommissioningReviewScreen } from "../screens/new-game/NewGameCommissioningReviewScreen.js";
import { NewGameFleetMethodScreen } from "../screens/new-game/NewGameFleetMethodScreen.js";
import { NewGameIdentityScreen } from "../screens/new-game/NewGameIdentityScreen.js";
import { NewGameLaunchingScreen } from "../screens/new-game/NewGameLaunchingScreen.js";
import { NewGameNationScreen } from "../screens/new-game/NewGameNationScreen.js";
import { RulesOfTheNavalAgeScreen } from "../screens/new-game/RulesOfTheNavalAgeScreen.js";
import type { AdmiralPresetValues } from "../screens/new-game/admiral-preset.js";
import {
  defaultFleetMethod,
  type FleetMethodDraft,
} from "../screens/new-game/new-game-fleet-method-screen-state.js";
import {
  defaultCampaignIdentity,
  type CampaignIdentityDraft,
} from "../screens/new-game/new-game-identity-screen-state.js";
import type { DraftPreferences } from "../screens/new-game/new-game-preferences-screen-state.js";
import { AppSidebar } from "./AppSidebar.js";
import { useBackground } from "./BackgroundContext.js";
import { CampaignShellProvider, useCampaignShellContext } from "./CampaignShellContext.js";
import {
  CAMPAIGN_SCREEN_SEARCH_TARGETS,
  CampaignScreenOutlet,
  type Screen,
} from "./campaign-screen-registry.js";
import type { CampaignShellMode } from "./campaign-shell-state.js";
import { MapSheet } from "./MapSheet.js";
import type { PrimaryAction } from "./primary-action.js";
import { SiteHeader } from "./SiteHeader.js";
import { type ActiveView, type HeaderCampaign, headerTitleFor } from "./site-header-state.js";
import { GuidedInspectionOverlay } from "./GuidedInspectionOverlay.js";
import { useGuidedInspection } from "./useGuidedInspection.js";
import { useTheme } from "./ThemeContext.js";
import { type NewGameDraft, useNewGameFlow } from "./useNewGameFlow.js";
import { WindowContextProvider } from "./WindowContext.js";

const EMPTY_SEARCH_TARGETS: readonly {
  readonly id: Screen;
  readonly label: string;
}[] = [];

declare global {
  interface Window {
    bluewave?: BluewaveDesktopBridge;
  }
}

interface BackgroundLayerProps {
  readonly background: ReturnType<typeof useBackground>["background"];
  readonly resolvedTheme: ReturnType<typeof useTheme>["resolvedTheme"];
}

function BackgroundLayer({ background, resolvedTheme }: BackgroundLayerProps) {
  switch (background) {
    case "water":
      return (
        <ShaderBackground
          variant="water"
          className="fixed inset-0 -z-10"
          colorBack={resolvedTheme === "dark" ? "#010101" : "#dbe9f4"}
          colorHighlight={resolvedTheme === "dark" ? "#121212" : "#ffffff"}
          speed={0.125}
        />
      );
    case "stars":
      return <StarsBackground className="fixed inset-0 -z-10" />;
    case "mesh-citrus":
      return (
        <ShaderBackground
          variant="mesh-gradient"
          className="fixed inset-0 -z-10"
          colors={
            resolvedTheme === "dark"
              ? ["#020202", "#2b1400", "#0f1a05", "#402008"]
              : ["#fff8e8", "#ffd166", "#d4f0a0", "#ffb84d"]
          }
          distortion={0.8}
          swirl={0.4}
          speed={0.125}
        />
      );
    case "mesh-lagoon":
      return (
        <ShaderBackground
          variant="mesh-gradient"
          className="fixed inset-0 -z-10"
          colors={
            resolvedTheme === "dark"
              ? ["#020a0a", "#0a2e2e", "#042a40", "#1a0a40"]
              : ["#f0fffa", "#5eead4", "#38bdf8", "#a78bfa"]
          }
          distortion={0.8}
          swirl={0.4}
          speed={0.15}
        />
      );
    case "auralis":
      return (
        <Auralis
          className="fixed inset-0 -z-10"
          speed={0.03}
          colors={
            resolvedTheme === "dark"
              ? ["#ef4444", "#dc2626", "#b91c1c"]
              : ["#ffb3b3", "#ff8a8a", "#ff6b6b"]
          }
        />
      );
    case "nebulore":
      return (
        <Nebulore
          className="fixed inset-0 -z-10"
          speed={0.025}
          colors={
            resolvedTheme === "dark"
              ? ["#312e81", "#9333ea", "#22d3ee"]
              : ["#c7d2fe", "#d8b4fe", "#a5f3fc"]
          }
        />
      );
    case "none":
      return null;
  }
}

interface CampaignUnavailableViewProps {
  readonly mode: Exclude<CampaignShellMode, { readonly kind: "campaign" }>;
  readonly draft: NewGameDraft | null;
  readonly newGameStatus: "ready" | "launching";
  readonly newGameError: string | null;
  readonly onOpenCampaign: (sessionId: string) => Promise<void>;
  readonly onStartNewGame: () => void;
  readonly onCancelToFile: () => void;
  readonly onConfirmNation: (nationId: string) => void;
  readonly onRecommendedSetup: (nationId: string) => void;
  readonly onBackToNation: () => void;
  readonly onPreferencesNext: (preferences: DraftPreferences, options: NewGameOptions) => void;
  readonly onBackToPreferences: () => void;
  readonly onArchetypeNext: (archetype: ArchetypeSelection) => void;
  readonly onBackToArchetype: () => void;
  readonly onIdentityNext: (identity: CampaignIdentityDraft) => void;
  readonly onBackToIdentity: () => void;
  readonly onFleetMethodNext: (fleetMethod: FleetMethodDraft) => void;
  readonly onBackToFleetMethod: () => void;
  readonly onLaunch: () => Promise<void>;
  readonly onBackToReviewFromLaunch: () => void;
  readonly onTakeCommand: () => Promise<void>;
  readonly onInspectOpeningBriefing: (
    sessionId: string,
  ) => Promise<BridgeResult<InspectOpeningBriefingResult>>;
  readonly briefingSessionId: string | null;
  readonly onPrimaryActionChange: (action: PrimaryAction | null) => void;
}

function CampaignUnavailableView(props: CampaignUnavailableViewProps) {
  switch (props.mode.kind) {
    case "opening":
      return <CampaignLoadingView />;
    case "open-error":
      return (
        <CampaignOpenErrorView
          message={props.mode.message}
          onOpenCampaign={props.onOpenCampaign}
          onStartNewGame={props.onStartNewGame}
        />
      );
    case "new-game-nation":
      return (
        <NewGameNationScreen
          error={props.newGameError}
          onCancel={props.onCancelToFile}
          onConfirm={props.onConfirmNation}
          onRecommendedSetup={props.onRecommendedSetup}
          onPrimaryActionChange={props.onPrimaryActionChange}
        />
      );
    case "new-game-preferences":
      return (
        <CampaignPreferencesView
          onCancel={props.onBackToNation}
          onNext={props.onPreferencesNext}
          recommendedPreset={props.draft?.recommendedPreset ?? null}
        />
      );
    case "new-game-archetype":
      return props.draft === null ? (
        <CampaignFileView
          onOpenCampaign={props.onOpenCampaign}
          onStartNewGame={props.onStartNewGame}
        />
      ) : (
        <NewGameArchetypeScreen
          initialArchetype={props.draft.archetype}
          onBack={props.onBackToPreferences}
          onNext={props.onArchetypeNext}
          onPrimaryActionChange={props.onPrimaryActionChange}
        />
      );
    case "new-game-identity":
      return (
        <NewGameIdentityScreen
          initialIdentity={props.draft?.identity ?? defaultCampaignIdentity()}
          onBack={props.onBackToArchetype}
          onNext={props.onIdentityNext}
          onPrimaryActionChange={props.onPrimaryActionChange}
        />
      );
    case "new-game-fleet-method":
      return (
        <NewGameFleetMethodScreen
          initialFleetMethod={props.draft?.fleetMethod ?? defaultFleetMethod()}
          status={props.newGameStatus}
          error={props.newGameError}
          onBack={props.onBackToIdentity}
          onNext={props.onFleetMethodNext}
          onPrimaryActionChange={props.onPrimaryActionChange}
        />
      );
    case "new-game-review":
      return props.draft === null ||
        props.draft.preferences === null ||
        props.draft.identity === null ||
        props.draft.fleetMethod === null ? (
        <CampaignFileView
          onOpenCampaign={props.onOpenCampaign}
          onStartNewGame={props.onStartNewGame}
        />
      ) : (
        <NewGameCommissioningReviewScreen
          nationId={props.draft.nationId}
          options={props.draft.options}
          preferences={props.draft.preferences}
          archetype={props.draft.archetype ?? defaultArchetypeSelection()}
          identity={props.draft.identity}
          fleetMethod={props.draft.fleetMethod}
          status={props.newGameStatus}
          error={props.newGameError}
          onBack={props.onBackToFleetMethod}
          onBeginCommission={props.onLaunch}
          onPrimaryActionChange={props.onPrimaryActionChange}
        />
      );
    case "new-game-launching":
      return (
        <NewGameLaunchingScreen
          error={props.newGameError}
          onBackToReview={props.onBackToReviewFromLaunch}
        />
      );
    case "opening-briefing":
      return props.briefingSessionId === null ? (
        <CampaignFileView
          onOpenCampaign={props.onOpenCampaign}
          onStartNewGame={props.onStartNewGame}
        />
      ) : (
        <NewGameBriefingScreen
          sessionId={props.briefingSessionId}
          onInspectOpeningBriefing={props.onInspectOpeningBriefing}
          onTakeCommand={props.onTakeCommand}
        />
      );
    case "file":
      return (
        <>
          <CampaignFileView
            onOpenCampaign={props.onOpenCampaign}
            onStartNewGame={props.onStartNewGame}
          />
          <CampaignListScreen />
        </>
      );
  }
}

function CampaignLoadingView() {
  return (
    <div className="p-8">
      <p>Loading campaign…</p>
    </div>
  );
}

interface CampaignFileViewProps {
  readonly onOpenCampaign: (sessionId: string) => Promise<void>;
  readonly onStartNewGame: () => void;
}

function CampaignFileView({ onOpenCampaign, onStartNewGame }: CampaignFileViewProps) {
  return <CampaignFileScreen onOpenCampaign={onOpenCampaign} onStartNewGame={onStartNewGame} />;
}

function CampaignOpenErrorView({
  message,
  onOpenCampaign,
  onStartNewGame,
}: CampaignFileViewProps & { readonly message: string }) {
  return (
    <div className="p-8">
      <CampaignFileView onOpenCampaign={onOpenCampaign} onStartNewGame={onStartNewGame} />
      <div className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 p-4">
        <p className="m-0 text-destructive">{message}</p>
      </div>
    </div>
  );
}

interface CampaignPreferencesViewProps {
  readonly onCancel: () => void;
  readonly onNext: (preferences: DraftPreferences, options: NewGameOptions) => void;
  readonly recommendedPreset: AdmiralPresetValues | null;
}

function CampaignPreferencesView({
  onCancel,
  onNext,
  recommendedPreset,
}: CampaignPreferencesViewProps) {
  return (
    <div className="p-8">
      <RulesOfTheNavalAgeScreen
        onCancel={onCancel}
        onNext={onNext}
        recommendedPreset={recommendedPreset}
      />
    </div>
  );
}

function ActiveCampaignView({ screen }: { readonly screen: Screen }) {
  return (
    <div className="p-8 font-sans">
      <CampaignScreenOutlet screen={screen} />
    </div>
  );
}

interface AppFrameProps {
  readonly campaignSessionId: string | null;
  readonly screen: Screen;
  readonly saveMessage: string | null;
  readonly header: React.ReactNode;
  readonly children: React.ReactNode;
  readonly onSelectScreen: (screen: Screen) => void;
}

function AppFrame({
  campaignSessionId,
  screen,
  saveMessage,
  header,
  children,
  onSelectScreen,
}: AppFrameProps) {
  return (
    <SidebarProvider className="h-svh flex-col overflow-hidden bg-transparent">
      {header}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {campaignSessionId !== null && (
          <AppSidebar screen={screen} onSelect={onSelectScreen} footer={campaignSessionId} />
        )}
        <SidebarInset className="relative min-h-0 overflow-auto bg-transparent">
          {saveMessage !== null && (
            <Alert
              variant="default"
              className="absolute left-4 right-4 top-2 z-50 border backdrop-blur-sm"
            >
              <AlertDescription>{saveMessage}</AlertDescription>
            </Alert>
          )}
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function CampaignShellApplication({
  bridge,
}: {
  readonly bridge: BluewaveDesktopBridge | undefined;
}) {
  const { resolvedTheme } = useTheme();
  const { background } = useBackground();
  const shell = useCampaignShellContext();
  const [windowState, setWindowState] = useState<WindowState | null>(null);
  const newGame = useNewGameFlow(bridge, {
    openCampaign: shell.actions.openCampaign,
    selectScreen: shell.actions.selectScreen,
  });

  useEffect(() => {
    let active = true;
    async function loadWindowState(): Promise<void> {
      if (bridge === undefined) return;
      try {
        const state = await bridge.getWindowState();
        if (active) setWindowState(state);
      } catch {
        // Keep the platform-derived fallback when IPC is temporarily unavailable.
      }
    }
    void loadWindowState();
    return () => {
      active = false;
    };
  }, [bridge]);

  const platform = bridge?.platform ?? "darwin";
  const headerCampaign: HeaderCampaign | null = useMemo(
    () =>
      shell.state.campaign === null
        ? null
        : {
            month: shell.state.campaign.month,
            treasury: shell.state.campaign.treasury,
            nationName: shell.state.campaign.nationName,
            projectedSurplusDeficit: shell.state.campaign.projectedSurplusDeficit,
            activeAlertsCount: shell.state.campaign.activeAlertsCount,
          },
    [shell.state.campaign],
  );

  const windowContextValue = useMemo(
    () => ({
      platform,
      windowState: windowState ?? {
        platform,
        isMaximized: false,
        maximizable: true,
        minimizable: true,
      },
      titlebar: { title: headerTitleFor(headerCampaign) },
      windowMinimize: () => bridge?.windowMinimize(),
      windowMaximizeToggle: () => bridge?.windowMaximizeToggle(),
      windowClose: () => bridge?.windowClose(),
    }),
    [bridge, headerCampaign, platform, windowState],
  );

  const [reviewOpen, setReviewOpen] = useState(false);

  const activeView: ActiveView =
    shell.state.mode.kind === "campaign"
      ? "playing"
      : shell.state.mode.kind === "new-game-nation" ||
          shell.state.mode.kind === "new-game-preferences" ||
          shell.state.mode.kind === "new-game-archetype" ||
          shell.state.mode.kind === "new-game-identity" ||
          shell.state.mode.kind === "new-game-fleet-method" ||
          shell.state.mode.kind === "new-game-review" ||
          shell.state.mode.kind === "new-game-launching" ||
          shell.state.mode.kind === "opening-briefing"
        ? "new_game"
        : "menu";

  const searchTargets =
    shell.state.campaign === null ? EMPTY_SEARCH_TARGETS : CAMPAIGN_SCREEN_SEARCH_TARGETS;

  const header = (
    <SiteHeader
      title={headerTitleFor(headerCampaign)}
      activeView={activeView}
      campaign={headerCampaign}
      back={{
        disabled: !shell.state.canGoBack,
        onTrigger: shell.actions.goBack,
      }}
      forward={{
        disabled: !shell.state.canGoForward,
        onTrigger: shell.actions.goForward,
      }}
      {...(shell.state.primaryAction !== null ? { continueAction: shell.state.primaryAction } : {})}
      searchTargets={searchTargets}
      onSearchNavigate={(id) => shell.actions.selectScreen(id as Screen)}
      onAdvanceMonth={shell.state.campaign !== null ? () => setReviewOpen(true) : undefined}
      advancingMonth={shell.state.committing}
    />
  );

  const content =
    shell.state.mode.kind !== "campaign" ? (
      <CampaignUnavailableView
        mode={shell.state.mode}
        draft={newGame.state.draft}
        newGameStatus={newGame.state.status}
        newGameError={newGame.state.error}
        onOpenCampaign={shell.actions.openCampaign}
        onStartNewGame={newGame.actions.start}
        onCancelToFile={newGame.actions.cancel}
        onConfirmNation={newGame.actions.confirmNation}
        onRecommendedSetup={newGame.actions.applyRecommendedSetup}
        onBackToNation={newGame.actions.backToNation}
        onPreferencesNext={newGame.actions.acceptPreferences}
        onBackToPreferences={newGame.actions.backToPreferences}
        onArchetypeNext={newGame.actions.acceptArchetype}
        onBackToArchetype={newGame.actions.backToArchetype}
        onIdentityNext={newGame.actions.acceptIdentity}
        onBackToIdentity={newGame.actions.backToIdentity}
        onFleetMethodNext={newGame.actions.acceptFleetMethod}
        onBackToFleetMethod={newGame.actions.backToFleetMethod}
        onLaunch={newGame.actions.launch}
        onBackToReviewFromLaunch={newGame.actions.backToReviewFromLaunch}
        onTakeCommand={newGame.actions.takeCommand}
        onInspectOpeningBriefing={async (sessionId) => {
          if (bridge === undefined) {
            return {
              outcome: "error",
              reason: "BRIDGE_UNAVAILABLE",
              diagnostics: ["The desktop bridge is unavailable."],
            };
          }
          return bridge.campaign.execute("inspectOpeningBriefing", sessionId);
        }}
        briefingSessionId={newGame.state.briefingSessionId}
        onPrimaryActionChange={shell.actions.setPrimaryAction}
      />
    ) : (
      <ActiveCampaignView screen={shell.state.screen} />
    );

  const guidedSessionId =
    shell.state.mode.kind === "campaign" ? shell.state.mode.campaign.sessionId : null;
  const guided = useGuidedInspection({ sessionId: guidedSessionId });

  return (
    <WindowContextProvider value={windowContextValue}>
      <BackgroundLayer background={background} resolvedTheme={resolvedTheme} />
      <AppFrame
        campaignSessionId={shell.state.campaign?.sessionId ?? null}
        screen={shell.state.screen}
        saveMessage={shell.state.saveMessage}
        header={header}
        onSelectScreen={shell.actions.selectScreen}
      >
        {content}
      </AppFrame>
      <MapSheet />
      <MonthlyResolutionLoading committing={shell.state.committing} />
      {shell.state.saveMessage !== null &&
        shell.state.saveMessage.startsWith("Could not advance month:") && (
          <MonthlyResolutionFailure
            message={shell.state.saveMessage}
            onReturn={() => shell.actions.selectScreen("overview")}
            onRetry={async () => {
              // saveMessage is cleared on next commit attempt via month-commit-started
              await shell.actions.advanceMonth();
            }}
          />
        )}
      {shell.state.campaign !== null && (
        <PreTurnReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          sessionId={shell.state.campaign.sessionId}
          campaign={shell.state.campaign}
          saving={shell.state.saving}
          saveMessage={shell.state.saveMessage}
          committing={shell.state.committing}
          onAdvance={async () => {
            setReviewOpen(false);
            await shell.actions.advanceMonth();
          }}
        />
      )}
      {guided.visible && !guided.loading && (
        <GuidedInspectionOverlay
          stepIndex={guided.stepIndex}
          onStepChange={(idx, completed) => {
            if (completed) void guided.dismiss(idx);
            else void guided.advance(idx);
          }}
          onDismiss={(idx) => void guided.dismiss(idx)}
          onNavigate={(screenId) => shell.actions.selectScreen(screenId as Screen)}
        />
      )}
    </WindowContextProvider>
  );
}

export function App() {
  const bridge = window.bluewave;
  return (
    <CampaignShellProvider bridge={bridge}>
      <CampaignShellApplication bridge={bridge} />
    </CampaignShellProvider>
  );
}
