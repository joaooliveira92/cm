/**
 * The squad screen's single polite announcer (note: Screen-reader
 * announcements, AC-32). One `role="status"` line per table, deduplicated by
 * `announce`; identical messages for the table are spoken once. The screen
 * feeds this `speak` from every state-changing callback so a sort, filter,
 * selection or view change is reported in whichever layout is on screen.
 *
 * Owned here, separate from the rest of the screen state, because the
 * announcement is a one-way side channel: it holds the last line admitted but
 * takes no part in the sort/focus/selection graph.
 */
import { useCallback, useState } from "react";
import { announce } from "../table/announcement.js";
import type { TableAnnouncement } from "../table/types.js";

const TABLE_ID = "squad";

export const useSquadAnnouncements = (): {
  readonly announcement: TableAnnouncement | null;
  readonly speak: (eventId: string, message: string) => void;
} => {
  const [announcement, setAnnouncement] = useState<TableAnnouncement | null>(
    null,
  );
  const speak = useCallback((eventId: string, message: string) => {
    if (announce({ tableId: TABLE_ID, eventId, message })) {
      setAnnouncement({ tableId: TABLE_ID, eventId, message });
    }
  }, []);
  return { announcement, speak };
};
