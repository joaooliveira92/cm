import { type ClubId, type SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const ClubInformationScreen = ({ saveId: _saveId, clubId }: { readonly saveId: SaveId; readonly clubId: ClubId }) => (
  <main
    tabIndex={-1}
    data-focus-id="clubInformation"
    aria-label="Club Information"
    className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}
  >
    <h1 className="text-2xl font-bold">Club Information</h1>
    <p className="mt-1 text-sm text-text-mono">Club {clubId}</p>
    <p className="mt-4 text-text-secondary italic">WIP — Placeholder screen</p>
  </main>
);