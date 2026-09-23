import { FOCUS_RING } from "../focus.js";

export const ManagerConfidenceScreen = () => {
  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Board Confidence" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">Board Confidence</h1>
      <p className="mt-1 text-sm text-text-secondary">
        The board&rsquo;s view of your performance and your current objectives.
      </p>
      <p className="mt-4 text-text-secondary italic">
        Board confidence details are available from the Club section.
      </p>
    </main>
  );
};