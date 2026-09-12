import { type PlayerId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const PlayerProfileScreen = ({ saveId: _saveId, playerId }: { readonly saveId: SaveId; readonly playerId: PlayerId }) => (
  <main
    tabIndex={-1}
    data-focus-id="playerProfile"
    aria-label="Player Profile"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Player Profile</h1>
    <p className="mt-1 text-sm text-text-mono">Player {playerId}</p>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);