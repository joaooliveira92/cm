import { type SaveId } from "@cm-clone/contracts";
import { MatchProvider } from "./MatchProvider.js";
import { CommentaryProvider } from "./CommentaryProvider.js";
import { MatchDayLayout } from "./components/MatchDayLayout.js";

export const MatchDayScreen = ({ saveId }: { readonly saveId: SaveId }) => (
  <MatchProvider saveId={saveId}>
    <CommentaryProvider>
      <MatchDayLayout />
    </CommentaryProvider>
  </MatchProvider>
);