import { RPC_CHANNEL, type AppRpcMethod, type RpcPayload, type RpcResult } from "@cm-clone/contracts";
import { contextBridge, ipcRenderer } from "electron";

const call = async <M extends AppRpcMethod>(
  method: M,
  payload: RpcPayload<M>,
): Promise<RpcResult<M>> => {
  const result = await ipcRenderer.invoke(RPC_CHANNEL, method, payload);
  return result as RpcResult<M>;
};

ipcRenderer.on("show-quit-guard", () => {
  const event = new CustomEvent("show-quit-guard");
  window.dispatchEvent(event);
});

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  /**
   * `discardSaveId` is the provisional career the player just agreed to lose. It travels with the
   * confirmation so the *main* process can delete it before taking the exit — a renderer-side
   * delete would be a promise racing `app.quit()`, and losing that race orphans the world.
   */
  confirmQuit: (discardSaveId?: string) => {
    ipcRenderer.send("quit-guard-confirmed", discardSaveId ?? null);
  },
  cancelQuit: () => {
    ipcRenderer.send("quit-guard-cancelled");
  },
  quitApplication: () => {
    ipcRenderer.send("request-quit");
  },
});

contextBridge.exposeInMainWorld("cmClone", { call });
