/**
 * Club Finances (Screen 39): any club's Transfer and Wage Budgets.
 *
 * The club-scoped sibling of `BudgetReviewScreen` (Screen 145), which is the manager's own. Both
 * render `BudgetFigures` — one grid implementation, two ways in — per
 * [the club-scoped rule](../../../../.agents/notes/proposed/architecture/2026-09-19-a-club-screen-is-club-scoped-unless-only-your-club-has-one.md).
 * `club_budgets` is keyed on `club_id`, so every club has budgets and nothing about the subject is
 * own-club.
 *
 * **Four figures, and no more.** The import asks for income, expenditure, wage bill history and
 * projections; none has a model, and the Group C ledger `deferred`s them. A screen showing an
 * invented balance is worse than the placeholder it replaced.
 */
import { type ClubId, type SaveId } from "@cm-clone/contracts";
import { BudgetFigures } from "../budgetReview/BudgetFigures.js";
import { FOCUS_RING } from "../focus.js";
import {
  clubFinancesAtom,
  describeRpcError,
  typedError,
  useAtomValue,
  type RpcClientError,
} from "../rpc.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

/** A defect-only cause carries no typed error, so it falls back to the generic line. */
const messageOf = (error: RpcClientError<"getClubFinances"> | null): string =>
  error === null ? "Club finances could not be loaded." : describeRpcError(error);

const ClubFinancesMessage = ({ message }: { readonly message: string }) => (
  <main tabIndex={-1} data-focus-id="clubFinancesDetail" aria-label="Club Finances" className={PAGE_CLASS}>
    <h1 className="text-2xl font-bold">Club Finances</h1>
    <p className="mt-4 text-text-secondary">{message}</p>
  </main>
);

export const ClubFinancesDetailScreen = ({
  saveId,
  clubId,
}: {
  readonly saveId: SaveId;
  readonly clubId: ClubId;
}) => {
  const result = useAtomValue(clubFinancesAtom(saveId, clubId));

  if (result._tag === "Failure") return <ClubFinancesMessage message={messageOf(typedError(result))} />;
  if (result._tag !== "Success") return <ClubFinancesMessage message="Loading club finances..." />;

  const view = result.value;

  return (
    <main tabIndex={-1} data-focus-id="clubFinancesDetail" aria-label="Club Finances" className={PAGE_CLASS}>
      <h1 className="text-2xl font-bold">{view.club.name}</h1>
      {view.isUserClub ? null : <p className="mt-1 text-sm text-text-secondary">[Not your club]</p>}
      <p className="mt-1 mb-6 text-sm text-text-secondary">
        This club's current Transfer Budget, Wage Budget, and committed wages.
      </p>

      <BudgetFigures
        transferBudgetRemaining={view.transferBudgetRemaining}
        wageBudget={view.wageBudget}
        committedWages={view.committedWages}
        headroom={view.headroom}
      />
    </main>
  );
};
