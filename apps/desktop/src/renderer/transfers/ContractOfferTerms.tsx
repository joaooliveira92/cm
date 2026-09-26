/**
 * The Contract Offer terms form (Screen 137, ticket 09): the Role an offer names, its length, and
 * the weekly wage offered — the three terms `signFreeAgent` takes, which the Transfers screen's
 * context region previously had no way to express (it signed a Free Agent at the formula wage).
 *
 * The figures on screen are the offer read's own, gated on the manager's Scouting Progress, and the
 * wage input is bounded by the band that read published: a Fully Scouted player supports exactly one
 * wage, and a below-Fully-Scouted one supports the band the manager's knowledge drew. The Role is
 * not free text — the offer names one of the player's own Positions and `POSITION_ROLES` gives that
 * Position its Role, so the choice the manager makes is one they can actually make.
 *
 * The terms live here rather than in the screen assembly because the read needs a definite Player,
 * and only a mounted leaf guarantees one. The live terms are mirrored into the ref the stable
 * `sign-free-agent` Action handler reads, so the command palette signs the offer on screen instead of
 * needing a second form of the same numbers.
 */
import { useEffect, useRef, useState } from "react";
import type { PlayerId, Role, SaveId } from "@cm-clone/contracts";
import {
  DEFAULT_CONTRACT_YEARS,
  MAX_CONTRACT_YEARS,
  MIN_CONTRACT_YEARS,
  POSITION_ROLES,
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
  readonly role: Role;
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

  const [role, setRole] = useState<Role | null>(null);
  const [years, setYears] = useState(DEFAULT_CONTRACT_YEARS);
  const [wageInput, setWageInput] = useState("");

  // The player's own Positions are the only Roles on offer. The first read seeds the choice; a later
  // re-read (the scouting key moved) keeps whatever the manager had picked as long as the player
  // still holds it, and falls back to the first Position otherwise. A different player starts over
  // — the old role and wage belong to the old player's knowledge.
  useEffect(() => {
    if (offer === undefined) return;
    const first = offer.positions[0];
    if (first === undefined) return;
    setRole((current) =>
      current !== null && offer.positions.some((entry) => POSITION_ROLES[entry.position] === current)
        ? current
        : POSITION_ROLES[first.position],
    );
  }, [offer, playerId]);
  // The wage is a seed, and it is seeded once per *player* rather than once per read. A re-read of
  // the same player carries the same offer, and it moves whenever the manager's Scouting Progress
  // for that player advances, so keying the seed on the read would quietly replace the number the
  // manager is in the middle of offering with a midpoint of a band they never saw — including the
  // moment their own scouting narrows the band under their typing. The ref records which player the
  // seeded number belongs to, so a *different* player still starts over, and the same player keeps
  // what they typed. If a re-read does leave the wage outside the new band, the submit button
  // refuses it, which is the honest answer: the manager's own knowledge moved under the offer.
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
    offer !== undefined && role !== null && wageValid ? { role, years, wage } : null;
  termsRef.current = terms;

  if (offerError !== null) {
    return <p className="mt-1 text-sm text-text-secondary">{describeRpcError(offerError)}</p>;
  }
  if (offer === undefined) {
    return (
      <p className="mt-1 text-sm text-text-secondary">
        Reading this player's contract offer&hellip;
      </p>
    );
  }

  return (
    <div className="mt-3" data-action-region="sign-free-agent">
      <p className="text-sm text-text-secondary">
        Free Agent &mdash; signable for Credits 0. Overall Rating {formatFigure(offer.overallRating)},
        weekly wage {formatFigureCredits(offer.wage)}.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-text-body" htmlFor="offer-role">
          Role
          <Select
            value={role ?? ""}
            onValueChange={(value) => {
              if (value !== null) setRole(value as Role);
            }}
          >
            <SelectTrigger
              id="offer-role"
              aria-label={`Role offered to ${playerName}`}
              className="w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {offer.positions.map((entry) => (
                <SelectItem key={entry.position} value={POSITION_ROLES[entry.position]}>
                  {POSITION_ROLES[entry.position]} ({entry.position})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="text-sm text-text-body" htmlFor="offer-years">
          Length
          <Select
            value={String(years)}
            onValueChange={(value) => {
              if (value !== null) setYears(Number(value));
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
        <label className="text-sm text-text-body" htmlFor="offer-wage">
          Weekly wage
          <Input
            id="offer-wage"
            type="number"
            min={1}
            step={1}
            className="w-32"
            value={wageInput}
            onChange={(event) => setWageInput(event.target.value)}
          />
        </label>
        <Button
          type="button"
          data-action-id="sign-free-agent"
          disabled={!windowOpen || terms === null}
          onClick={() => {
            if (terms === null) return;
            void dispatchAction("sign-free-agent", { playerId, ...terms });
          }}
        >
          Sign (0 Cr)
        </Button>
      </div>
      {!wageValid && (
        <p className="mt-2 text-sm text-text-muted">
          The wage must be {formatFigureCredits(offer.wage)} &mdash; what your knowledge of this
          player supports.
        </p>
      )}
    </div>
  );
};
