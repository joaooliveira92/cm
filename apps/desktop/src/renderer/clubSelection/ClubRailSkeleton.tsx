import { Skeleton } from "../components/ui/skeleton.js";

const SKELETON_ROWS = 6;

/** The rail while the club read is in flight. */
export const ClubRailSkeleton = () => (
  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1" aria-busy="true">
    {Array.from({ length: SKELETON_ROWS }, (_, index) => (
      <Skeleton key={index} className="h-10 w-full" />
    ))}
    <span className="sr-only">Loading clubs…</span>
  </div>
);
