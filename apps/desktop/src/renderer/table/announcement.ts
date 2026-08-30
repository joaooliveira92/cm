/**
 * Per-table announcement dedup (note: Screen-reader announcements, AC-32). One
 * `role="status"` polite announcer per table; identical messages for one table
 * are announced once. A different message clears the memory so a recurring
 * message can be spoken again later. Pure `announce` returns whether the line
 * is new — the caller renders exactly the deduplicated line.
 */
import type { TableAnnouncement, TableId } from "./types.js";

const lastMessageByTable = new Map<TableId, string>();

/** True when `announcement` is novel for its table and should be spoken.
 *  Identical consecutive messages are suppressed. */
export const announce = (announcement: TableAnnouncement): boolean => {
  const prior = lastMessageByTable.get(announcement.tableId);
  if (prior === announcement.message) return false;
  lastMessageByTable.set(announcement.tableId, announcement.message);
  return true;
};

/** Forget every table's last line (tests; also allows a re-show of a message
 *  whose earlier occurrence is still the remembered one). */
export const resetAnnouncements = (): void => {
  lastMessageByTable.clear();
};

/** Forget one table's line. */
export const resetTableAnnouncements = (tableId: TableId): void => {
  lastMessageByTable.delete(tableId);
};