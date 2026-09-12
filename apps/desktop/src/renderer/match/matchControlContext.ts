/**
 * The Match day live control panel's shared context.
 *
 * The panel's operational mode is a discriminated union (`PanelMode`) that makes
 * illegal states unrepresentable: only one mode is active at a time. Injury
 * severity and shorthandedness remain as derived metadata because they can
 * coexist with any mode.
 */
import { createContext, useContext, type RefObject } from "react";
import type {
  InjuryView,
  PlayerId,
  SquadPlayerView,
  SubstitutionStatusView,
  Tactic,
} from "@cm-clone/contracts";

export type PanelMode =
  | { readonly _tag: "closed" }
  | { readonly _tag: "open" }
  | { readonly _tag: "injury-prompt"; readonly severity: "red" | "orange" }
  | { readonly _tag: "injury-decision" }
  | { readonly _tag: "sub-draft" };

export interface MatchControlState {
  readonly open: boolean;
  readonly squad: ReadonlyArray<SquadPlayerView>;
  readonly tactic: Tactic | null;
  readonly outPlayerId: PlayerId;
  readonly inPlayerId: PlayerId;
  readonly isHalftime: boolean;
  readonly status: string | null;
  readonly subAlert: string | null;
  readonly mode: PanelMode;
  /** Live match facts mirrored from the parent MatchProvider (Phase 1) so sub-components
   *  derive their variants locally instead of receiving boolean props. */
  readonly subsStatus: SubstitutionStatusView;
  readonly onPitchCount: number;
  readonly injuryPrompt: boolean;
  readonly hasRedInjury: boolean;
  readonly orangeInjury: InjuryView | undefined;
  readonly isShorthanded: boolean;
}

export interface MatchControlActions {
  setIsHalftime: (value: boolean) => void;
}

export interface MatchControlMeta {
  readonly toggleRef: RefObject<HTMLButtonElement | null>;
}

export interface MatchControlContextValue {
  readonly state: MatchControlState;
  readonly actions: MatchControlActions;
  readonly meta: MatchControlMeta;
}

export const MatchControlContext = createContext<MatchControlContextValue | null>(null);

export const useMatchControlContext = (): MatchControlContextValue => {
  const ctx = useContext(MatchControlContext);
  if (ctx === null) {
    throw new Error("useMatchControlContext must be used within the Match control panel");
  }
  return ctx;
};
