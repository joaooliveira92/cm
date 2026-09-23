import { FOCUS_RING } from "../focus.js";

export const ManagerNotesScreen = () => {
  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Notes" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Notes</h1>
      <p className="mt-1 text-sm text-text-secondary">Your personal notes about players, clubs, and tactics.</p>
      <p className="mt-8 text-text-secondary italic">Notes are not yet implemented.</p>
    </main>
  );
};