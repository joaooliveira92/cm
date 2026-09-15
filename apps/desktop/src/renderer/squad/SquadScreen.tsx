/**
 * Squad screen — thin composition shell. Mounts the provider and composes the
 * squad table leaf. All state, refs, and wiring live in the useSquadScreen hook
 * and the SquadTable view component.
 */
import type { SaveId } from "@cm-clone/contracts";
import { SquadProvider } from "./SquadProvider.js";
import { SquadTable } from "./SquadTable.js";

export const SquadScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <SquadProvider saveId={saveId}>
    <SquadTable />
  </SquadProvider>
);
