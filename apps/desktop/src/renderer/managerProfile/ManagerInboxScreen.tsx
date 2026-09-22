import type { SaveId } from "@cm-clone/contracts";
import { useAtomValue } from "../rpc.js";
import { newsInboxAtom, describeRpcError, typedError } from "../rpc.js";
import { FOCUS_RING } from "../focus.js";

export const ManagerInboxScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = useAtomValue(newsInboxAtom(saveId));

  const error = typedError(result);
  if (error)
    return (
      <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Inbox" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
        <p className="text-text-secondary">{describeRpcError(error)}</p>
      </main>
    );
  if (result._tag !== "Success")
    return (
      <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Inbox" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
        <p className="text-text-secondary">Loading inbox...</p>
      </main>
    );

  const { messages, counts } = result.value;

  return (
    <main tabIndex={-1} data-focus-id="manager" aria-label="Manager Inbox" className={`bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`}>
      <h1 className="text-2xl font-bold">
        Inbox
        {counts.unread > 0 && (
          <span className="ml-2 text-sm font-normal text-text-secondary">
            ({counts.unread} unread{counts.actionRequired > 0 ? `, ${counts.actionRequired} require action` : ""})
          </span>
        )}
      </h1>
      <p className="mt-1 mb-4 text-sm text-text-secondary">Recent messages and updates.</p>

      {messages.length === 0 ? (
        <p className="text-text-secondary italic">No messages.</p>
      ) : (
        <ul className="space-y-2">
          {messages.map((msg: { messageId: string; subject: string; body: string; category: string }) => (
            <li key={msg.messageId} className="rounded-md border border-border-subtle px-3 py-2 text-sm text-text-body">
              <span className="font-medium">{msg.subject}</span>
              <p className="mt-0.5 text-xs text-text-secondary">{msg.body}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
};