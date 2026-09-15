import { createContext, type ReactNode, use, useMemo } from "react";
import type { BluewaveDesktopBridge } from "../../preload/index.js";
import type { useCampaignShell } from "./useCampaignShell.js";
import { useCampaignShell as useCampaignShellState } from "./useCampaignShell.js";

type CampaignShell = ReturnType<typeof useCampaignShell>;

export interface CampaignShellContextValue {
  readonly state: Pick<
    CampaignShell,
    | "campaign"
    | "loading"
    | "error"
    | "saving"
    | "saveMessage"
    | "primaryAction"
    | "committing"
    | "mode"
    | "screen"
    | "canGoBack"
    | "canGoForward"
  >;
  readonly actions: Pick<
    CampaignShell,
    | "openCampaign"
    | "closeCampaign"
    | "saveCampaign"
    | "advanceMonth"
    | "selectScreen"
    | "setPrimaryAction"
    | "goBack"
    | "goForward"
  >;
  readonly meta: {
    readonly bridgeAvailable: boolean;
  };
}

const CampaignShellContext = createContext<CampaignShellContextValue | null>(null);

export function CampaignShellProvider({
  bridge,
  children,
}: {
  readonly bridge: BluewaveDesktopBridge | undefined;
  readonly children: ReactNode;
}) {
  const shell = useCampaignShellState(bridge);
  const value = useMemo<CampaignShellContextValue>(
    () => ({
      state: {
        campaign: shell.campaign,
        loading: shell.loading,
        error: shell.error,
        saving: shell.saving,
        saveMessage: shell.saveMessage,
        primaryAction: shell.primaryAction,
        committing: shell.committing,
        mode: shell.mode,
        screen: shell.screen,
        canGoBack: shell.canGoBack,
        canGoForward: shell.canGoForward,
      },
      actions: {
        openCampaign: shell.openCampaign,
        closeCampaign: shell.closeCampaign,
        saveCampaign: shell.saveCampaign,
        advanceMonth: shell.advanceMonth,
        selectScreen: shell.selectScreen,
        setPrimaryAction: shell.setPrimaryAction,
        goBack: shell.goBack,
        goForward: shell.goForward,
      },
      meta: { bridgeAvailable: bridge !== undefined },
    }),
    [bridge, shell],
  );

  return <CampaignShellContext.Provider value={value}>{children}</CampaignShellContext.Provider>;
}

export function useCampaignShellContext(): CampaignShellContextValue {
  const context = use(CampaignShellContext);
  if (context === null) {
    throw new Error("useCampaignShellContext must be used within CampaignShellProvider");
  }
  return context;
}
