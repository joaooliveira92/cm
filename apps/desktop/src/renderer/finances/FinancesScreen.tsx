/**
 * The Club section's Finances destination — the manager's own club, rendered by the screen that
 * already renders any club's.
 *
 * A resolver, not a screen, exactly as `ClubInfoScreen` and `StaffOverviewScreen` are.
 * `ClubFinancesDetailScreen` (Screen 39) takes a `clubId` because `club_budgets` is keyed on
 * `club_id` and every club has budgets; a navbar entry names only a save. Before this there were
 * two placeholders for Screen 39, `finances/` and `clubFinancesDetail/`.
 *
 * Distinct from `budgetReview/` (Screen 145), which is a Recruitment sub-surface over the same four
 * figures — both render `BudgetFigures`, so there is one grid however you arrive.
 */
import { type SaveId } from "@cm-clone/contracts";
import { ClubFinancesDetailScreen } from "../clubFinancesDetail/ClubFinancesDetailScreen.js";
import { FOCUS_RING } from "../focus.js";
import {
  describeRpcError,
  squadAtom,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getSquad"> | null): string =>
  error === null ? "Club finances could not be loaded." : describeRpcError(error);

const FinancesMessage = ({ message }: { readonly message: string }) => (
  <main tabIndex={-1} data-focus-id="finances" aria-label="Finances" className={PAGE_CLASS}>
    <h1 className="text-2xl font-bold">Finances</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

export const FinancesScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const squadResult = useAtomValue(squadAtom(saveId));

  if (squadResult._tag === "Failure")
    return <FinancesMessage message={messageOf(typedError(squadResult))} />;
  if (squadResult._tag !== "Success")
    return <FinancesMessage message="Loading club finances..." />;

  return <ClubFinancesDetailScreen saveId={saveId} clubId={squadResult.value.club.id} />;
};
