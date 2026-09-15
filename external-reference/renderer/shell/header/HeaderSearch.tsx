import { GlobalSearch } from "../GlobalSearch.js";
import type { SearchTarget } from "../global-search-state.js";

export interface HeaderSearchProps {
  readonly targets: readonly SearchTarget[];
  readonly onNavigate: (id: string) => void;
}

export function HeaderSearch({ targets, onNavigate }: HeaderSearchProps) {
  return <GlobalSearch targets={targets} onNavigate={onNavigate} />;
}
