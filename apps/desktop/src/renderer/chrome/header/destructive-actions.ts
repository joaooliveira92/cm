/** Menu actions that ask for confirmation before they dispatch: neither can be undone. */
const DESTRUCTIVE_ACTION_IDS = new Set(["resign", "retire"]);

export const isDestructiveAction = (actionId: string): boolean => DESTRUCTIVE_ACTION_IDS.has(actionId);
