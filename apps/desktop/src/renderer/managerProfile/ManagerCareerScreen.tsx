import type { SaveId } from "@cm-clone/contracts";
import { FOCUS_RING } from "../focus.js";

export const ManagerCareerScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Career" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Career History</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Your complete managerial career — all clubs, competitions, and achievements.
      </p>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Current Position</h2>
        <p className="mt-1 text-base text-text-body">Manager</p>
        <p className="text-sm text-text-secondary">Current club</p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Career Summary</h2>
        <p className="mt-1 text-sm text-text-secondary italic">Career statistics will appear here once available.</p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Previous Clubs</h2>
        <p className="mt-1 text-sm text-text-secondary italic">No previous clubs.</p>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">Competitions Won</h2>
        <p className="mt-1 text-sm text-text-secondary italic">None yet.</p>
      </div>
    </main>
  );
};