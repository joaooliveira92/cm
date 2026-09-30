/**
 * The Contract Offer terms form (Screen 137, ticket 09): an offer's length and the weekly wage
 * offered — the two terms `signFreeAgent` takes. An offer names no position: CM 03/04 contracts did
 * not, and a player's positions are ratings on the player, not a term of his contract.
 *
 * The figures on screen are the offer read's own, gated on the manager's Scouting Progress, and the
 * wage input is bounded by the band that read published: a Fully Scouted player supports exactly one
 * wage, and a below-Fully-Scouted one supports the band the manager's knowledge drew.
 *
 * The terms live here rather than in the screen assembly because the read needs a definite Player,
 * and only a mounted leaf guarantees one. The live terms are mirrored into the ref the stable
 * `sign-free-agent` Action handler reads, so the command palette signs the offer on screen instead of
 * needing a second form of the same numbers.
 *
 * The component is an orchestrator: it owns the offer read, holds the term controls' state via
 * `useContractOfferTerms`, and lays the extracted sections out. Each section — the offer summary,
 * the two term fields, the Sign action, and the wage-basis hint — is its own component with one
 * responsibility. The whole tree stays in this one file because the Transfers screen parcels it into
 * the context region as a single leaf; nothing here is shared with another screen.
 */
import { useEffect, useRef, useState } from "react";
import type { ContractOfferView, PlayerId, SaveId } from "@cm-clone/contracts";
import {
  DEFAULT_CONTRACT_YEARS,
  MAX_CONTRACT_YEARS,
  MIN_CONTRACT_YEARS,
  wageIsWithinFigure,
  type KnownFigure,
} from "@cm-clone/shared";
import { dispatchAction } from "../actions/dispatch.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select.js";
import { formatFigure, formatFigureCredits, figureMid } from "../format.js";
import {
  AsyncResult,
  contractOfferAtom,
  describeRpcError,
  typedError,
  useAtomValue,
} from "../rpc.js";
import { Option } from "effect";

/** The terms one offer carries, in the vocabulary `signFreeAgent` takes. */
export interface ContractTerms {
  readonly years: number;
  readonly wage: number;
}

/** The Contract lengths a manager may name, straight off the shared bounds so the form cannot
 *  offer a length the command would reject. */
export const CONTRACT_LENGTHS: ReadonlyArray<number> = Array.from(
  { length: MAX_CONTRACT_YEARS - MIN_CONTRACT_YEARS + 1 },
  (_, index) => MIN_CONTRACT_YEARS + index,
);

/** A wage the offer supports, for the form to start from.
 *
 *  The midpoint of a band can be a half number — `209 Cr–534 Cr` midpoints to 371.5 — and a wage the
 *  manager did not type is one the manager is offering, so it has to be a whole number of Credits
 *  like any other: `wageIsWithinFigure` refuses a fraction, and a form that seeded one would open on
 *  terms its own submit button rejects. Rounding cannot leave the band, because a band whose ends
 *  are whole numbers brackets its own midpoint. */
const seededWage = (figure: KnownFigure): number => Math.round(figureMid(figure));

export interface ContractOfferTermsProps {
  readonly saveId: SaveId;
  readonly playerId: PlayerId;
  readonly playerName: string;
  readonly windowOpen: boolean;
  /** The live terms, mirrored out for the stable Action handler. */
  readonly termsRef: React.MutableRefObject<ContractTerms | null>;
}

/** The offer's headline — what the player is worth and what wage the offer may carry. The figures are
 *  the read's own, so this section is the one place the form draws them from. */
const OfferSummary = ({
  overallRating,
  wage,
}: {
  readonly overallRating: KnownFigure;
  readonly wage: KnownFigure;
}) => (
  <p className="text-body text-text-secondary">
    Free Agent &mdash; signable for Credits 0. Overall Rating {formatFigure(overallRating)},
    weekly wage {formatFigureCredits(wage)}.
  </p>
);

/** The Length field: the shared `CONTRACT_LENGTHS` bounds, labelled in years. */
const LengthChoice = ({
  value,
  playerName,
  onValueChange,
}: {
  readonly value: number;
  readonly playerName: string;
  readonly onValueChange: (years: number) => void;
}) => (
  <label className="text-label text-text-soft" htmlFor="offer-years">
    Length
    <Select
      value={String(value)}
      onValueChange={(next) => {
        if (next !== null) onValueChange(Number(next));
      }}
    >
      <SelectTrigger
        id="offer-years"
        aria-label={`Contract length offered to ${playerName}`}
        className="w-32"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTRACT_LENGTHS.map((length) => (
          <SelectItem key={length} value={String(length)}>
            {length} {length === 1 ? "year" : "years"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </label>
);

/** The Weekly wage field: a whole-number Credits input, seeded by `useContractOfferTerms` and
 *  validated against the band the offer published. */
const WageField = ({
  value,
  onValueChange,
}: {
  readonly value: string;
  readonly onValueChange: (input: string) => void;
}) => (
  <label className="text-label text-text-soft" htmlFor="offer-wage">
    Weekly wage
    <Input
      id="offer-wage"
      type="number"
      min={1}
      step={1}
      className="w-32"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    />
  </label>
);

/** The form's single action: dispatch the live terms to the `sign-free-agent` Action. Whether the
 *  offer may be signed is the parent's call — this section just carries the verb. */
const SignTermButton = ({
  disabled,
  onSign,
}: {
  readonly disabled: boolean;
  readonly onSign: () => void;
}) => (
  <Button type="button" data-action-id="sign-free-agent" disabled={disabled} onClick={onSign}>
    Sign (0 Cr)
  </Button>
);

/** The refusal the form shows when the typed wage has left the band the offer published — the
 *  honest answer to the manager's own knowledge having moved under the offer. */
const WageBasisHint = ({ wage }: { readonly wage: KnownFigure }) => (
  <p className="mt-2 text-body text-text-muted">
    The wage must be {formatFigureCredits(wage)} &mdash; what your knowledge of this player
    supports.
  </p>
);

/** The live terms of the offer under edit: the fields' state, the seed that starts a
 *  player, the band check that gates the Sign action, and the outward mirror.
 *
 *  The wage is seeded once per *player*. The wage seed is keyed on the player the
 *  seeded number belongs to (`seededForPlayer`), not the read — a re-read of the same player carries
 *  the same offer, and it moves whenever the manager's Scouting Progress for that player advances, so
 *  keying on the read would quietly replace the number the manager is in the middle of offering with
 *  a midpoint of a band they never saw, including the moment their own scouting narrows the band
 *  under their typing. A *different* player still starts over. */
const useContractOfferTerms = (
  offer: ContractOfferView | undefined,
  playerId: PlayerId,
  termsRef: React.MutableRefObject<ContractTerms | null>,
): {
  readonly years: number;
  readonly setYears: (years: number) => void;
  readonly wageInput: string;
  readonly setWageInput: (input: string) => void;
  readonly wageValid: boolean;
  readonly terms: ContractTerms | null;
} => {
  const [years, setYears] = useState(DEFAULT_CONTRACT_YEARS);
  const [wageInput, setWageInput] = useState("");

  // The wage is a seed, and it is seeded once per *player* rather than once per read. See the hook's
  // doc comment for the reasoning — the ref records which player the seeded number belongs to, so a
  // different player starts over, the same player keeps what they typed, and a re-read that leaves
  // the wage outside the new band is refused by the Sign gate, which is the honest answer.
  const seededForPlayer = useRef<PlayerId | null>(null);
  useEffect(() => {
    if (offer === undefined) return;
    if (seededForPlayer.current === playerId) return;
    seededForPlayer.current = playerId;
    setWageInput(String(seededWage(offer.wage)));
  }, [offer, playerId]);

  const wage = Number(wageInput);
  const wageValid = offer !== undefined && wageIsWithinFigure(wage, offer.wage);
  const terms: ContractTerms | null =
    offer !== undefined && wageValid ? { years, wage } : null;
  termsRef.current = terms;

  return { years, setYears, wageInput, setWageInput, wageValid, terms };
};

export const ContractOfferTerms = ({
  saveId,
  playerId,
  playerName,
  windowOpen,
  termsRef,
}: ContractOfferTermsProps) => {
  const offerResult = useAtomValue(contractOfferAtom(saveId, playerId));
  const offer = Option.getOrUndefined(AsyncResult.value(offerResult));
  const offerError = typedError(offerResult);

  const { years, setYears, wageInput, setWageInput, wageValid, terms } =
    useContractOfferTerms(offer, playerId, termsRef);

  if (offerError !== null) {
    return <p className="mt-1 text-body text-text-secondary">{describeRpcError(offerError)}</p>;
  }
  if (offer === undefined) {
    return (
      <p className="mt-1 text-body text-text-secondary">
        Reading this player's contract offer&hellip;
      </p>
    );
  }

  return (
    <div className="mt-3" data-action-region="sign-free-agent">
      <OfferSummary overallRating={offer.overallRating} wage={offer.wage} />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <LengthChoice value={years} playerName={playerName} onValueChange={setYears} />
        <WageField value={wageInput} onValueChange={setWageInput} />
        <SignTermButton
          disabled={!windowOpen || terms === null}
          onSign={() => {
            if (terms === null) return;
            void dispatchAction("sign-free-agent", { playerId, ...terms });
          }}
        />
      </div>
      {!wageValid && <WageBasisHint wage={offer.wage} />}
    </div>
  );
};