/** §16.3 / §25.4. One error summary, above the actions, listing every blocker. */
import type { SelectionIssueRow } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";

export const SelectionIssues = ({
  blocking,
  warnings,
}: {
  readonly blocking: readonly SelectionIssueRow[];
  readonly warnings: readonly SelectionIssueRow[];
}) => (
  <>
    {blocking.length > 0 && (
      <Alert variant="destructive" className="mt-4">
        <h3 className="font-semibold">This selection cannot be used yet</h3>
        <ul className="mt-1 list-disc pl-5">
          {blocking.map((entry) => (
            <li key={`${entry.code}-${entry.nationId ?? "global"}`}>{entry.message}</li>
          ))}
        </ul>
      </Alert>
    )}
    {warnings.length > 0 && (
      <Alert role="status" className="mt-4 border-text-warning/40 bg-text-warning/10 text-text-warning">
        <ul className="list-disc pl-5">
          {warnings.map((entry) => (
            <li key={`${entry.code}-${entry.nationId ?? "global"}`}>{entry.message}</li>
          ))}
        </ul>
      </Alert>
    )}
  </>
);
