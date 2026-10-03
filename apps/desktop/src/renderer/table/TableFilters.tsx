import type { FilterClause } from "./types.js";
import { Button } from "../components/ui/button.js";
import { clearFilters } from "./features/filtering.js";

export interface TableFiltersResetProps {
  readonly filterActive: boolean;
  readonly onSetFilters: (filters: readonly FilterClause[]) => void;
  readonly clearFiltersLabel: string;
}

const TableFiltersReset = ({
  filterActive,
  onSetFilters,
  clearFiltersLabel,
}: TableFiltersResetProps) =>
  filterActive ? (
    <Button type="button" variant="secondary" onClick={() => onSetFilters(clearFilters())}>
      {clearFiltersLabel}
    </Button>
  ) : null;

export const TableFilters = {
  Reset: TableFiltersReset,
};