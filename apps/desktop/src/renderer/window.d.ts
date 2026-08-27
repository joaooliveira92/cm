import type { AppRpcMethod, RpcPayload, RpcSuccess } from "@cm-clone/contracts";

declare global {
  interface Window {
    cmClone: {
      call<M extends AppRpcMethod>(method: M, payload: RpcPayload<M>): Promise<RpcSuccess<M>>;
    };
  }
}
