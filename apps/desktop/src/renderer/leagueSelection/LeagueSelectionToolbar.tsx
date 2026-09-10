import type * as React from "react";
import { STATUS_FILTERS, type StatusFilter } from "@cm-clone/shared";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { SELECT_CLASS } from "./selectStyles.js";
import { useLeagueSelectionContext } from "./LeagueSelectionProvider.js";

const STATUS_FILTER_LABELS: Readonly<Record<StatusFilter, string>> = {
  all: "All",
  selected: "Selected",
  playable: "Playable",
  background: "Background",
  view_only: "View only",
  included_by_dependency: "Included by dependency",
  warnings: "Warnings",
  unavailable: "Unavailable",
};

export const LeagueSelectionToolbar = () => {
  const { state, actions: { dispatch, applyPreset } } = useLeagueSelectionContext();
  const index = state.index;
  const modelState = state.state;

  if (index === null) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-3">
      <label className="flex flex-col text-xs text-text-secondary">
        Search nations or competitions
        <Input
          type="search"
          value={modelState.searchQuery}
          onChange={(event) => dispatch({ type: "SET_SEARCH_QUERY", query: event.target.value })}
          className="mt-1"
        />
      </label>
      <label className="flex flex-col text-xs text-text-secondary">
        Region
        <Select
          value={modelState.regionFilterId ?? ""}
          onValueChange={(value) =>
            dispatch({
              type: "SET_REGION_FILTER",
              regionId: value === "" || value === null ? null : value,
            })
          }
        >
          <SelectTrigger aria-label="Region" className={SELECT_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All regions</SelectItem>
            {index.regions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <label className="flex flex-col text-xs text-text-secondary">
        Status
        <Select
          value={modelState.statusFilter}
          onValueChange={(value) => {
            if (value !== null) {
              dispatch({
                type: "SET_STATUS_FILTER",
                filter: value as StatusFilter,
              });
            }
          }}
        >
          <SelectTrigger aria-label="Status" className={SELECT_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((filter) => (
              <SelectItem key={filter} value={filter}>
                {STATUS_FILTER_LABELS[filter]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      <div className="flex items-end gap-2">
        <Button type="button" variant="secondary" onClick={() => applyPreset("recommended")}>
          Recommended
        </Button>
        <Button type="button" variant="secondary" onClick={() => applyPreset("minimal")}>
          Minimal
        </Button>
        <Button type="button" variant="secondary" onClick={() => applyPreset("broad_world")}>
          Broad world
        </Button>
      </div>
    </div>
  );
};
