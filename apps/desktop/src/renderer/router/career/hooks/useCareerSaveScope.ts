import type { SaveId } from "@cm-clone/contracts";
import { useParams } from "@tanstack/react-router";
import type { RouteParamDecode } from "../../../navigation/params.js";
import { decodeSaveId } from "../../../navigation/params.js";
import { resetTableSessions } from "../../../table/tableState.js";

/**
 * Table session state (sort/filters/focus/scroll for the table screens) is
 * module-level in `tableState.ts`, so a NEW save mounting in the career shell
 * must clear it BEFORE the child screens' mount initializers seed from it. The
 * guard runs in the render body (a mount effect would run after the children
 * captured the previous save's session) keyed on the save — intra-save screen
 * navigation keeps the session (the note's "Screen navigation survives" row), a
 * save switch and a post-reload remount clear it (the note's "Save reload" row).
 */
let activeCareerSaveKey: string | null = null;

/** The career parent route's save scope (`/career/$saveId`), decoded at the
 *  boundary: the `SaveId` the shell keys everything on, or the reason the
 *  address is malformed. A malformed `:saveId` leaves the module-level session
 *  key untouched — there is no save to scope anything to. */
export const useCareerSaveScope = (): RouteParamDecode<SaveId> => {
  const decoded = decodeSaveId(useParams({ strict: false }).saveId ?? "");
  if (decoded._tag === "Malformed") return decoded;
  const saveKey = String(decoded.success);
  if (activeCareerSaveKey !== saveKey) {
    activeCareerSaveKey = saveKey;
    resetTableSessions();
  }
  return decoded;
};