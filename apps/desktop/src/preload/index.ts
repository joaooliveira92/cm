import { RPC_CHANNEL, type AppRpcMethod, type RpcPayload, type RpcSuccess } from "@cm-clone/contracts";
import { contextBridge, ipcRenderer } from "electron";

const call = async <M extends AppRpcMethod>(
  method: M,
  payload: RpcPayload<M>,
): Promise<RpcSuccess<M>> => {
  const result = await ipcRenderer.invoke(RPC_CHANNEL, method, payload);
  if (result._tag === "Failure") {
    throw new Error(
      typeof result.error === "object" && result.error !== null && "_tag" in result.error
        ? String((result.error as { _tag: unknown })._tag)
        : "RPC call failed",
    );
  }
  return result.value;
};

contextBridge.exposeInMainWorld("cmClone", { call });
