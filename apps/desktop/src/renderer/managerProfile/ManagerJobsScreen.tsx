import { FOCUS_RING } from "../focus.js";

export const ManagerJobsScreen = () => {
  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Jobs" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Jobs</h1>
      <p className="mt-1 text-sm text-text-secondary">Available job vacancies and your job security.</p>
      <p className="mt-8 text-text-secondary italic">The job market is not yet implemented.</p>
    </main>
  );
};