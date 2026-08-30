/**
 * The runtime dispatch mechanism for registered Actions (ADR-0012). The registry
 * holds the *structure* (id, label, scope, binding, availability) collected at
 * startup; handlers are screen-live and register here per mount, so a screen can
 * close over its own React hooks (mutation setters) while the key map, palette
 * and badges all dispatch by stable id.
 *
 * A handler is only present while its screen is mounted, which is exactly when
 * its Action is available — so the palette can never list an Action the registry
 * cannot dispatch (AC-16).
 */

type AnyHandler = (params: unknown) => void | Promise<void>;

const handlers = new Map<string, AnyHandler>();

/** Register a live handler for `id` (screen mount). Returns an unregister fn. */
export const registerActionHandler = (id: string, handler: AnyHandler): (() => void) => {
  handlers.set(id, handler);
  return () => {
    if (handlers.get(id) === handler) handlers.delete(id);
  };
};

/** Dispatch a registered Action by stable id. No-op when unmounted/unknown. */
export const dispatchAction = (id: string, params?: unknown): void | Promise<void> => {
  const handler = handlers.get(id);
  if (handler === undefined) return;
  return handler(params);
};

/** True when a handler is currently registered (palette availability check). */
export const hasActionHandler = (id: string): boolean => handlers.has(id);

/** Reset all handlers (tests). */
export const resetActionHandlers = (): void => {
  handlers.clear();
};
