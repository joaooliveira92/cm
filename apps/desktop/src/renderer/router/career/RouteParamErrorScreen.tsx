import { Alert } from "../../components/ui/alert.js";
import { PANEL } from "../../theme.js";

/** A malformed route is a structural failure: the danger alert panel grammar
 *  with no Retry, because there is nothing to retry on a bad address. The panel
 *  name is not restated — the alert panel plus the danger tone carry the
 *  severity (text-led, per the empty/error grammar). */
export const RouteParamErrorScreen = ({
  reason,
}: {
  readonly reason: string;
}) => (
  <main className={`min-h-screen bg-background p-8 text-foreground ${PANEL}`}>
    <Alert variant="destructive">
      <span className="font-semibold">Invalid career address</span>
      <p className="mt-1">{reason}</p>
    </Alert>
  </main>
);