import type { PlayerId } from "@cm-clone/contracts";

interface TransferTarget {
  readonly playerId: PlayerId;
}

let pending: TransferTarget | null = null;

export const setTransferTarget = (target: TransferTarget): void => {
  pending = target;
};

export const consumeTransferTarget = (): TransferTarget | null => {
  const next = pending;
  pending = null;
  return next;
};