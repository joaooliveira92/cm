/**
 * The career subsystem's public surface: the manager's own thread through a save, as opposed to
 * the club's.
 *
 * `clubSelection` (the squad readout a manager picks a club from), `managerProfile` (the profile
 * and its screen), `managerStatus` (employment state, and the archived-save guard every write
 * command asks first), `staff` (the coaching staff a club carries), and `news` (the inbox the
 * career reads its events back through).
 */

export {
  getClubSelection,
  strongestPosition,
  summarizeSquad,
  type SquadReadoutPlayer,
} from "./clubSelection.js";
export { getManagerProfile, getManagerProfileScreen, loadManagerProfile } from "./managerProfile.js";
export {
  assertSaveNotArchived,
  loadManagerStatus,
  releaseClubStaff,
  type ManagerStatusRow,
} from "./managerStatus.js";
export { getNewsInbox, parseNewsMessageId, setNewsMessageState } from "./news.js";
export { freshStaffId, loadCoachQuality, materialiseStaff } from "./staff.js";
