import { DEFAULT_SET_PIECE_ROLES, type SetPieceRoles, type Slot } from "@cm-clone/shared";

export interface SetPieceSlotResult {
  readonly isGoalkeeper: boolean;
  readonly setPieceRoles: SetPieceRoles;
}

export const resolveSetPieceModifiers = (
  cell: Slot,
  roles: SetPieceRoles | undefined,
): SetPieceSlotResult => ({
  isGoalkeeper: cell.row === "GK",
  setPieceRoles: roles ?? DEFAULT_SET_PIECE_ROLES,
});