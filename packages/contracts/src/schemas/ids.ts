import { Schema } from "effect";

/**
 * Branded ID types. Every entity identifier in this contract is a `string` at runtime, so without
 * a brand `startMatch({ saveId, opponentClubId })` accepts the two transposed and the whole
 * codebase agrees. `Schema.brand` is nominal — it narrows the decoded type and adds no runtime
 * check — so decoding a payload hands the main process values that only fit the parameter they
 * belong to. Construct one from a raw string (a SQL row, a `randomUUID()`) with `SaveId.make(s)`.
 */
export const SaveId = Schema.String.pipe(Schema.brand("SaveId"));
export type SaveId = Schema.Schema.Type<typeof SaveId>;

export const ClubId = Schema.String.pipe(Schema.brand("ClubId"));
export type ClubId = Schema.Schema.Type<typeof ClubId>;

export const PlayerId = Schema.String.pipe(Schema.brand("PlayerId"));
export type PlayerId = Schema.Schema.Type<typeof PlayerId>;

export const MatchId = Schema.String.pipe(Schema.brand("MatchId"));
export type MatchId = Schema.Schema.Type<typeof MatchId>;

/** A fixture's key is an integer: nothing outside the save ever names a fixture, so the
 *  canonical-id rule that governs clubs and players does not reach it. */
export const FixtureId = Schema.Finite.pipe(Schema.brand("FixtureId"));
export type FixtureId = Schema.Schema.Type<typeof FixtureId>;

export const BidId = Schema.String.pipe(Schema.brand("BidId"));
export type BidId = Schema.Schema.Type<typeof BidId>;

/**
 * Setup-scope identifiers. Branded for the same reason `SaveId`/`ClubId` are: `resolveLeagueSelection`
 * takes a Nation id and a League Scope Option id side by side, and without the brand the two
 * transposed is a well-typed call that resolves to the wrong career.
 */
export const RegionId = Schema.String.pipe(Schema.brand("RegionId"));
export type RegionId = Schema.Schema.Type<typeof RegionId>;

export const NationId = Schema.String.pipe(Schema.brand("NationId"));
export type NationId = Schema.Schema.Type<typeof NationId>;

export const CompetitionId = Schema.String.pipe(Schema.brand("CompetitionId"));
export type CompetitionId = Schema.Schema.Type<typeof CompetitionId>;

export const ScopeOptionId = Schema.String.pipe(Schema.brand("ScopeOptionId"));
export type ScopeOptionId = Schema.Schema.Type<typeof ScopeOptionId>;

export const SnapshotId = Schema.String.pipe(Schema.brand("SnapshotId"));
export type SnapshotId = Schema.Schema.Type<typeof SnapshotId>;

/** A message's identity is its position in the `events` log — `"<stream_type>:<stream_id>:<seq>"`.
 *  Nothing mints it, so a message id can never name an event that does not exist, and the same
 *  career event is the same message across reloads. Branded at the decode so a raw string cannot be
 *  passed where a message id is expected. */
export const NewsMessageId = Schema.String.pipe(Schema.brand("NewsMessageId"));
export type NewsMessageId = typeof NewsMessageId.Type;
