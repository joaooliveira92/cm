/**
 * The RPC edge's public surface — the wiring layer's outermost ring. `rpcServer` is the single
 * `handleRpc` dispatcher every renderer call lands in, `logging` the wide-event Logger it runs
 * each call inside, and `keybindings` the userData-backed keybinding overrides it reads and writes.
 *
 * `main/index.ts` deliberately reaches past this barrel to `./rpc/rpcServer.js` and
 * `./rpc/logging.js` directly: it is the Electron entry point and pulls in the whole process
 * anyway, so a barrel there would buy nothing.
 */

export {
  BINDING_SHAPE,
  KEYBINDINGS_FILE,
  LOCKED_INFRA_BINDINGS,
  decodeOverrides,
  getKeyBindingOverrides,
  parseOverridesFile,
  resetAllKeyBindings,
  resetKeyBinding,
  setKeyBindingOverride,
} from "./keybindings.js";
export { LoggerLayer, withWideEvent, type WideEvent } from "./logging.js";
export { handleRpc, type RpcContext } from "./rpcServer.js";
