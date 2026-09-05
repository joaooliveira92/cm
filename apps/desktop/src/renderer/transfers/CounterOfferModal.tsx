/**
 * Counter-offer modal compound leaf (ticket 15). Reads shared counter state
 * from useTransfers() and renders InlineModal with inline error on invalid/empty
 * submit; accept/reject/counter dispatch correctly.
 */
import { InlineModal } from "./InlineModal.js";
import { formatCredits } from "../table/transfers/marketColumns.js";
import { useTransfers } from "./TransfersProvider.js";

export const CounterOfferModal = () => {
  const { state, actions, meta } = useTransfers();
  const { counters, counterAmount, counterAmountValid, counterError } = state;
  const { setCounter, setCounterAmount, setCounterError, run, runRespond } = actions;
  const { saveId } = meta;

  if (counters === null) return null;

  return (
    <InlineModal
      title={`Counter ${counters.playerName}`}
      description={`Bid from ${counters.biddingClubName} for ${formatCredits(counters.amount)}.`}
      submitLabel="Counter"
      inputLabel="Counter-offer amount (Credits)"
      amountValue={counterAmount}
      onAmountChange={(value) => {
        setCounterAmount(value);
        setCounterError(null);
      }}
      onCancel={() => setCounter(null)}
      submitDisabled={counterAmount !== "" && !counterAmountValid}
      error={
        counterError ??
        (counterAmount !== "" && !counterAmountValid
          ? "Enter a valid counter-offer amount."
          : null)
      }
      onSubmit={() => {
        if (!counterAmountValid) {
          setCounterError("Enter a valid counter-offer amount.");
          return;
        }
        const amount = Number(counterAmount);
        const bidId = counters.bidId;
        setCounter(null);
        setCounterError(null);
        void run("Counter", () =>
          runRespond({ saveId, bidId, action: "counter", counterAmount: amount }),
        );
      }}
    />
  );
};
