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
  // The renderer reserves the macOS traffic-light inset in its own title band,
  // so it needs to know the platform. Read once at preload time: it cannot
  // change while the window lives.
  platform: process.platform,
  showQuitGuard: () => {
    return new Promise<void>((resolve) => {
      ipcRenderer.once("quit-guard-confirmed", () => {
        resolve();
      });
      ipcRenderer.send("show-quit-guard");
    });
  },
});

contextBridge.exposeInMainWorld("cmClone", { call });
