import type { AppRpcMethod, RpcPayload, RpcResult } from "@cm-clone/contracts";

declare global {
  interface Window {
    cmClone: {
      call<M extends AppRpcMethod>(method: M, payload: RpcPayload<M>): Promise<RpcResult<M>>;
    };
    electronAPI: {
      /** The host platform, from the preload's `process.platform`. */
      platform: NodeJS.Platform;
      showQuitGuard: () => Promise<void>;
    };
  }
}
