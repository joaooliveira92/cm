import { createContext, use } from "react";
import type { LeagueSelectionScreenActions, LeagueSelectionScreenMeta, LeagueSelectionScreenState } from "./useLeagueSelection.js";
import { useLeagueSelection } from "./useLeagueSelection.js";

export interface LeagueSelectionContextValue {
  readonly state: LeagueSelectionScreenState;
  readonly actions: LeagueSelectionScreenActions;
  readonly meta: LeagueSelectionScreenMeta;
  readonly isManage: boolean;
}

const LeagueSelectionContext = createContext<LeagueSelectionContextValue | null>(null);

export interface LeagueSelectionProviderProps {
  readonly manage: {
    readonly intents: readonly import("@cm-clone/contracts").NationSelectionIntentPayload[];
    readonly onApply: (intents: readonly import("@cm-clone/contracts").NationSelectionIntentPayload[]) => void;
    readonly onCancel: () => void;
  } | null;
  readonly onContinue: ((snapshot: import("@cm-clone/contracts").LeagueSelectionSnapshot) => void) | null;
  readonly onBack: () => void;
  readonly children: React.ReactNode;
}

export const LeagueSelectionProvider = ({
  manage,
  onContinue,
  onBack,
  children,
}: LeagueSelectionProviderProps) => {
  const { state, actions, meta } = useLeagueSelection({
    manage: manage === null ? null : {
      intents: manage.intents,
      onApply: manage.onApply,
      onCancel: manage.onCancel,
    },
    onContinue,
    onBack,
  });

  return (
    <LeagueSelectionContext value={{ state, actions, meta, isManage: manage !== null }}>
      {children}
    </LeagueSelectionContext>
  );
};

export const useLeagueSelectionContext = (): LeagueSelectionContextValue => {
  const ctx = use(LeagueSelectionContext);
  if (ctx === null) {
    throw new Error("useLeagueSelectionContext must be used within a LeagueSelectionProvider");
  }
  return ctx;
};

export const LeagueSelectionConsumer = LeagueSelectionContext;
