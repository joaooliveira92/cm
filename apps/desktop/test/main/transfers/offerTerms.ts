/**
 * The terms a manager's own knowledge supports for one player, read back off the Contract Offer
 * read rather than recomputed in the spec — the same route the terms form takes, so a spec that
 * signs somebody cannot silently agree with the command about what was signable.
 *
 * `wageInside` picks a whole number of Credits the published band contains (the band's low end,
 * lifted to at least 1 Cr, because a wage of 0 is not a wage). Both ends of a wage band are whole
 * Credits — `weeklyWage` rounds — so the low end is always inside it.
 */
import { DEFAULT_CONTRACT_YEARS, POSITION_ROLES, type KnownFigure } from "@cm-clone/shared";
import { Effect } from "effect";
import type { PlayerId, SaveId } from "@cm-clone/contracts";
import {
  getContractOffer,
  type ContractOfferTerms,
} from "../../../src/main/transfers/index.js";

const wageInside = (figure: KnownFigure): number =>
  figure._tag === "exact"
    ? figure.value
    : Math.max(1, Math.min(figure.high, Math.ceil(figure.low)));

/** Terms the club's knowledge supports: the player's first Position' Role, a length, and a wage
 *  inside the band the offer published. */
export const offerTermsFor = (
  savesDir: string,
  saveId: SaveId,
  playerId: PlayerId,
  years: number = DEFAULT_CONTRACT_YEARS,
): Effect.Effect<ContractOfferTerms, unknown, never> =>
  Effect.map(getContractOffer(savesDir, saveId, playerId), (offer) => ({
    role: POSITION_ROLES[offer.positions[0]!.position],
    years,
    wage: wageInside(offer.wage),
  }));
