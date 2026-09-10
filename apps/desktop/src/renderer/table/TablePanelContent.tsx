import type { ReactNode } from "react";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import type { FilterClause, TableViewState } from "./types.js";
import { useTableLoading } from "./TableLoadingProvider.js";
import { clearFilters } from "./features/filtering.js";
import type { TableStateCopy } from "./viewState.js";

export interface TablePanelContentRootProps {
  readonly viewState: TableViewState;
  readonly copy: TableStateCopy;
  readonly alertMessage?: string;
  readonly filters: readonly FilterClause[];
  readonly onSetFilters: (filters: readonly FilterClause[]) => void;
  readonly children: ReactNode;
}

const TablePanelContentRoot = ({
  viewState,
  copy,
  alertMessage,
  filters,
  onSetFilters,
  children,
}: TablePanelContentRootProps) => {
  const { onRetry } = useTableLoading();

  if (viewState._tag === "LoadError") {
    return (
      <Alert variant="destructive" className="mt-4">
        <p>{viewState.error.message}</p>
        {onRetry !== undefined && (
          <Button type="button" variant="secondary" className="mt-2" onClick={onRetry}>
            {copy.retryLabel}
          </Button>
        )}
      </Alert>
    );
  }

  return (
    <>
      {viewState._tag === "InitialLoading" && (
        <div aria-busy="true" className="py-6 text-text-secondary">
          {copy.initialLoading}
        </div>
      )}
      {viewState._tag === "EmptyDataset" && (
        <div className="py-6 text-text-secondary">{copy.emptyDataset}</div>
      )}
      {viewState._tag === "NoFilterResults" && (
        <div className="py-6 text-text-secondary">
          <p>{copy.noFilterResults}</p>
          <Button type="button" variant="secondary" className="mt-2" onClick={() => onSetFilters(clearFilters())}>
            {copy.clearFiltersLabel}
          </Button>
        </div>
      )}
      {children}
      {alertMessage !== undefined && (
        <Alert variant="destructive" className="mt-2">
          {alertMessage}
        </Alert>
      )}
    </>
  );
};

export const TablePanelContent = {
  Root: TablePanelContentRoot,
};