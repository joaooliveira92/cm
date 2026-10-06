import { BoardConfidenceFrame } from "./BoardConfidenceFrame.js";

/** The screen's not-ready states: loading and failure both render the title plus one line. */
export const BoardConfidenceMessage = ({ message }: { readonly message: string }) => (
  <BoardConfidenceFrame>
    <p className="mt-4 text-text-secondary">{message}</p>
  </BoardConfidenceFrame>
);