import { useEffect, useState } from "react";
import { type ClubSelectionRow, type SaveId } from "@cm-clone/contracts";
import { Effect, Result } from "effect";
import { Badge } from "./components/ui/badge.js";
import { Card, CardContent } from "./components/ui/card.js";
import { Spinner } from "./components/ui/spinner.js";
import { ClubSelectionPrototype } from "./create/clubSelectionPrototype/ClubSelectionPrototype.js";
import { FOCUS_RING } from "./focus.js";
import { describeRpcError, getClubSelection } from "./rpc.js";

/** The load outcome, lifted out of the render so a two-column layout can decide
 *  per region what to show. Consumed by the throwaway workspace prototype in
 *  `create/clubSelectionPrototype/`. */
export type ClubLoadState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | { readonly kind: "ready"; readonly clubs: ReadonlyArray<ClubSelectionRow> };

/** Today's shipped rendering: one scrolling column of cards. */
export const ClubCardList = ({
  clubs,
}: {
  readonly clubs: ReadonlyArray<ClubSelectionRow>;
}) => (
  <div tabIndex={-1} className={`space-y-6 ${FOCUS_RING.join(" ")}`}>
    {clubs.map((club) => (
      <Card key={club.clubId} className="transition-shadow hover:shadow-chrome">
        <CardContent className="pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-primary">{club.clubName}</span>
              <Badge variant="outline">{club.statureTier}</Badge>
            </div>
            <div className="text-right text-sm tabular-nums text-text-body">
              <span>${club.transferBudget.toFixed(0)}</span>
              <span>${club.wageBudget.toFixed(0)}</span>
            </div>
          </div>
          <dl className="mt-2 space-y-0.5 text-sm">
            <div className="flex items-center gap-2">
              <dt className="text-text-muted">Stature Tier</dt>
              <dd className="text-text-body">{club.statureTier}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-text-muted">Board Objective</dt>
              <dd className="text-text-body">{club.boardObjectiveMin} – {club.boardObjectiveMax}</dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="text-text-muted">Squad Quality</dt>
              <dd className="text-text-body">{club.squadQualityBand}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    ))}
  </div>
);

export const ClubSelectionScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const [state, setState] = useState<ClubLoadState>({ kind: "loading" });

  useEffect(() => {
    const load = async () => {
      const outcome = await Effect.runPromise(getClubSelection(saveId).pipe(Effect.result));
      if (Result.isFailure(outcome)) {
        setState({
          kind: "error",
          message: "Failed to load clubs: " + describeRpcError(outcome.failure),
        });
        return;
      }
      setState({ kind: "ready", clubs: outcome.success.clubs });
    };
    void load();
  }, [saveId]);

  // PROTOTYPE (throwaway, dev-only): the two-column workspace variants for
  // `.scratch/club-selection/issues/01-two-column-workspace-shape.md`. Variant 0
  // is the shipped rendering below, kept as the comparison baseline. Delete this
  // branch and `create/clubSelectionPrototype/` once a variant wins.
  //
  // Excluded under `MODE === "test"` on purpose: the a11y suite asserts against
  // the *shipped* screen, and a prototype that swaps what those tests see would
  // make them measure the throwaway instead.
  if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
    return <ClubSelectionPrototype state={state} />;
  }

  if (state.kind === "error") return <p className="p-8 text-destructive">{state.message}</p>;

  if (state.kind === "loading" || state.clubs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="inline-flex items-center gap-2 text-text-secondary">
          <Spinner /> Loading clubs...
        </p>
      </div>
    );
  }

  return <ClubCardList clubs={state.clubs} />;
};
