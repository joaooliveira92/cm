import type { AppRpcMethod, RpcPayload, RpcResult } from "@cm-clone/contracts";

declare global {
  interface Window {
    cmClone: {
      call<M extends AppRpcMethod>(method: M, payload: RpcPayload<M>): Promise<RpcResult<M>>;
    };
  }
}
