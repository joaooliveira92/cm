import { SandboxBody } from "./SandboxBody.js";
import { SandboxEventLedger } from "./SandboxEventLedger.js";
import { SandboxOutcomeCard } from "./SandboxOutcomeCard.js";
import { SandboxProvider, useSandbox, type SandboxContextValue } from "./SandboxProvider.js";
import { SandboxResolveCard } from "./SandboxResolveCard.js";
import { SandboxSetupCard } from "./SandboxSetupCard.js";

export const Sandbox = {
  Provider: SandboxProvider,
  Body: SandboxBody,
  SetupCard: SandboxSetupCard,
  ResolveCard: SandboxResolveCard,
  OutcomeCard: SandboxOutcomeCard,
  EventLedger: SandboxEventLedger,
};

export { SandboxProvider, useSandbox };
export type { SandboxContextValue };
