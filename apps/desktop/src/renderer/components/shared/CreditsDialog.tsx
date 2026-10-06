import { Button } from "../ui/button.js";
import { Dialog } from "./Dialog.js";

/**
 * The product's Credits surface (app-shell spec §5.4): informational, scrollable, and dismissed by a
 * single Back action. Shared between the Main Menu and Load Career, which each offer it as a layer,
 * so the two cannot drift on what the game says it is.
 */
export const CreditsDialog = ({ onClose }: { readonly onClose: () => void }) => (
  <Dialog title="Credits" onClose={onClose}>
    <div className="max-h-64 overflow-y-auto text-body text-text-secondary">
      <p>Championship Manager Clone — an original football management simulation.</p>
      <p className="mt-2">
        Every club, competition, and person in this game is fictional. No licensed imagery,
        database, or interface text from any other game is used.
      </p>
      <p className="mt-2">Built with Electron, React, and Effect.</p>
    </div>
    <div className="mt-4 flex items-center justify-end">
      <Button type="button" variant="secondary" autoFocus onClick={onClose}>
        Back
      </Button>
    </div>
  </Dialog>
);
