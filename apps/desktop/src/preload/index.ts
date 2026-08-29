import { RPC_CHANNEL, type AppRpcMethod, type RpcPayload, type RpcResult } from "@cm-clone/contracts";
import { contextBridge, ipcRenderer } from "electron";

const call = async <M extends AppRpcMethod>(
  method: M,
  payload: RpcPayload<M>,
): Promise<RpcResult<M>> => {
  const result = await ipcRenderer.invoke(RPC_CHANNEL, method, payload);
  return result as RpcResult<M>;
};

contextBridge.exposeInMainWorld("cmClone", { call });
