import type { ReactNode } from "react";

export interface StepHeadingProps {
  readonly title: string;
  readonly children?: ReactNode;
}

/**
 * The heading every sub-panel in the creation flow opens with: the panel's title
 * and, at most, one line saying what to do.
 *
 * It states neither the step number nor "Step N": the flow band already reads
 * "Step 2 of 4 · Manager", and the Manager step's own stepper names the
 * sub-step beside its number. Repeating that at heading size made the panel
 * announce what the chrome beside it had already said, so the cue is dropped
 * here and the title is set one notch under the band instead.
 */
export const StepHeading = ({ title, children }: StepHeadingProps) => (
  <>
    <h2 className="text-base font-medium tracking-tight text-text-primary">
      {title}
    </h2>
    {children !== undefined && (
      <p className="mt-1 text-sm text-text-muted">{children}</p>
    )}
  </>
);
