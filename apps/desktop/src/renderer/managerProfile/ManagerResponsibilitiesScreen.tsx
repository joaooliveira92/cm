import { FOCUS_RING } from "../focus.js";

export const ManagerResponsibilitiesScreen = () => {
  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Responsibilities" className={`p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-title">Responsibilities</h1>
      <p className="mt-1 text-body text-text-secondary">Which areas of the club you personally manage and which are delegated.</p>
      <p className="mt-8 text-text-secondary italic">Responsibilities delegation is not yet implemented.</p>
    </main>
  );
};