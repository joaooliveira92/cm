import type { AppRpcMethod, RpcPayload, RpcResult } from "@cm-clone/contracts";

declare global {
  interface Window {
    cmClone: {
      call<M extends AppRpcMethod>(method: M, payload: RpcPayload<M>): Promise<RpcResult<M>>;
    };
    electronAPI: {
      /** The host platform, from the preload's `process.platform`. */
      platform: NodeJS.Platform;
      /** Signal the main process to proceed with quitting. */
      confirmQuit: () => void;
      /** Signal the main process to cancel the quit. */
      cancelQuit: () => void;
      /** Ask the main process to quit the application (used to trigger
       *  `before-quit` from the renderer). */
      quitApplication: () => void;
    };
  }
}
