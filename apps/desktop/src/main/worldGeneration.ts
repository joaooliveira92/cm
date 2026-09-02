import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { ClubId, PlayerId, type SnapshotId } from "@cm-clone/contracts";
import { createSeededRng, deriveId, deriveSeed } from "@cm-clone/game-engine";
import {
  BASE_CONTENT_PACK,
  CITIES,
  LEAGUE_CLUBS,
  LEAGUE_SETUP_INDEX,
  NATION_CODES,
  canonicalCityId,
  canonicalNationId,
  generateSquad,
  type GeneratedPlayer,
} from "@cm-clone/shared";

/**
 * Deterministic world generation.
 *
 * A world is a pure function of its `WorldGenerationConfig`: the same seed and the same two
 * versions regenerate the same clubs, the same players, and the same identifiers. That is what
 * makes a save reproducible and a generation bug diagnosable — a report can name the seed that
 * produced it rather than a world nobody can get back.
 *
 * Seeds are *derived*, never shared: each club derives its seed from the world seed and its
 * canonical name, and each player derives theirs from their club's seed and their squad slot. So
 * adding a club, or renaming one, moves only that club's squad; with a single running stream every
 * entity after the change would shift.
 */

/** Bumped when the generation *code* changes shape in a way that alters output. */
export const GENERATOR_VERSION = "1.0.0";

/** Bumped when the generation *data* or its interpretation changes (squad demand, ability bands,
 *  club roster). Together with the world seed this identifies a world exactly. */
export const RULESET_VERSION = "1.0.0";

export interface WorldGenerationConfig {
  readonly worldSeed: number;
  /** The season year player ages are measured against. Pinned per save, never read from the clock,
   *  so a world regenerated in a later year is still the same world. */
  readonly referenceYear: number;
  /** The League Selection Snapshot this world is generated on behalf of. Recorded in the manifest
   *  as provenance, and — for the single-league generator — deliberately *not* an input to what
   *  gets generated: the re-resolution that validated it happened in `beginCareer`, and threading
   *  the resolved scope into competition rows is the next ticket's work. */
  readonly snapshotId: SnapshotId;
}

const attr = (attributes: GeneratedPlayer["attributes"], key: keyof GeneratedPlayer["attributes"]) =>
  attributes[key] ?? null;

/**
 * Generates the fixed 20-club League and each club's squad, writing the generation manifest, the
 * whole world catalogue (`nations` then `cities`), and then clubs/players/player_positions — all in
 * one sequence over the save's SQL client. No club is marked as the user's club — that happens in
 * `commitCareer`.
 *
 * The manifest is written first, so a partially-written save still records what was producing it.
 * It records the catalogue fingerprint, the content pack id/version, and the snapshot id beside
 * the seed and versions — the whole identity of this world if a later reader ever needs to
 * reproduce or diagnose it. None of these is an input to anything generated below: the catalogue
 * and the pack are code-derived static data (like `nations` and `cities`), and the snapshot's role
 * ended at `beginCareer`'s validation, so the rows are identical in every save from this ruleset.
 * The catalogue is written before any club so the rows are provably selection-independent: nothing
 * in this function reads what a selection could change (see the `WorldGenerationConfig`), so the
 * catalogue rows are identical in every save from this ruleset.
 *
 * Note: this is a single *sequence*, not an explicit SQLite transaction. A partially-written
 * provisional save is invisible (no `save_meta` row) and disposable, so the distinction is
 * harmless while generation stays provisional — but any ticket that later scales these writes
 * should decide whether the sequence deserves `sql.withTransaction`.
 */
export const generateWorld = ({ worldSeed, referenceYear, snapshotId }: WorldGenerationConfig) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;

    // Diagnostic only — deliberately not an input to anything generated below.
    const generatedAt = yield* Effect.clockWith((clock) => clock.currentTimeMillis).pipe(
      Effect.map((millis) => new Date(millis).toISOString()),
    );

    yield* sql`INSERT INTO generation_manifest (id, world_seed, generator_version, ruleset_version, reference_year, generated_at, catalogue_fingerprint, content_pack_id, content_pack_version, snapshot_id)
      VALUES (1, ${worldSeed}, ${GENERATOR_VERSION}, ${RULESET_VERSION}, ${referenceYear}, ${generatedAt},
        ${LEAGUE_SETUP_INDEX.fingerprint}, ${BASE_CONTENT_PACK.id}, ${BASE_CONTENT_PACK.version}, ${snapshotId})`;

    // The world catalogue, written before any club on the same connection as the rest of
    // generation. `nations` and `cities` are copied unconditionally — one nations row per
    // `NATION_CODES` member and one row per curated city of every nation, whatever a later
    // selection resolves to — because a player's nationality and birthplace are drawn from the whole
    // catalogue, not from the nations a save activated (spec rule 2). Both tables are code-derived
    // static data, so nothing here reads a seed, a count, or a collection length; the rows are
    // identical in every save this ruleset generates.
    for (const code of NATION_CODES) {
      yield* sql`INSERT INTO nations (id) VALUES (${canonicalNationId(code)})`;
    }

    for (const city of CITIES) {
      yield* sql`INSERT INTO cities (id, nation_id, name, population_band)
        VALUES (${canonicalCityId(city.nationCode, city.name)}, ${canonicalNationId(city.nationCode)}, ${city.name}, ${city.populationBand})`;
    }

    for (const clubDef of LEAGUE_CLUBS) {
      // Keyed on the club's canonical name rather than its ordinal, so reordering the roster does
      // not regenerate unrelated clubs' squads.
      const clubSeed = deriveSeed(worldSeed, "club", clubDef.name);
      const clubId = ClubId.make(deriveId(worldSeed, "club", clubDef.name));

      yield* sql`INSERT INTO clubs (id, name, stature_tier, is_user_club, generation_seed)
        VALUES (${clubId}, ${clubDef.name}, ${clubDef.statureTier}, 0, ${clubSeed})`;

      const squad = generateSquad(clubDef.statureTier, {
        referenceYear,
        randomForSlot: (slot) => createSeededRng(deriveSeed(clubSeed, "player", slot.index)),
      });

      for (const generated of squad) {
        const playerSeed = deriveSeed(clubSeed, "player", generated.slot.index);
        const playerId = PlayerId.make(deriveId(clubSeed, "player", generated.slot.index));
        const a = generated.attributes;

        yield* sql`INSERT INTO players (
          id, club_id, first_name, last_name, date_of_birth, potential_ability,
          passing, shooting, tackling, dribbling, heading, crossing, finishing, first_touch,
          positioning, decisions, composure, determination, teamwork, flair, bravery, aggression,
          pace, acceleration, stamina, strength, agility, natural_fitness, injury_proneness,
          gk_handling, gk_reflexes, gk_aerial_reach, gk_command_of_area, gk_kicking,
          squad_slot, generation_seed
        ) VALUES (
          ${playerId}, ${clubId}, ${generated.firstName}, ${generated.lastName}, ${generated.dateOfBirth}, ${generated.potentialAbility},
          ${attr(a, "passing")}, ${attr(a, "shooting")}, ${attr(a, "tackling")}, ${attr(a, "dribbling")}, ${attr(a, "heading")}, ${attr(a, "crossing")}, ${attr(a, "finishing")}, ${attr(a, "firstTouch")},
          ${attr(a, "positioning")}, ${attr(a, "decisions")}, ${attr(a, "composure")}, ${attr(a, "determination")}, ${attr(a, "teamwork")}, ${attr(a, "flair")}, ${attr(a, "bravery")}, ${attr(a, "aggression")},
          ${attr(a, "pace")}, ${attr(a, "acceleration")}, ${attr(a, "stamina")}, ${attr(a, "strength")}, ${attr(a, "agility")}, ${attr(a, "naturalFitness")}, ${attr(a, "injuryProneness")},
          ${attr(a, "gkHandling")}, ${attr(a, "gkReflexes")}, ${attr(a, "gkAerialReach")}, ${attr(a, "gkCommandOfArea")}, ${attr(a, "gkKicking")},
          ${generated.slot.index}, ${playerSeed}
        )`;

        for (const position of generated.positions) {
          yield* sql`INSERT INTO player_positions (player_id, position, familiarity) VALUES (${playerId}, ${position.position}, ${position.familiarity})`;
        }
      }
    }
  });

/**
 * Reads back the seed a save was generated from. Every later generation step — Season 1's
 * fixtures, the opening contracts — derives from this rather than drawing fresh randomness, so the
 * whole save, not just its squads, is reproducible.
 *
 * A save with no manifest row cannot exist: `generateWorld` writes it before any entity, in the
 * same transaction. Its absence means the file was not produced by this generator, so it surfaces
 * as a defect rather than a typed failure — no caller has a sensible recovery, and inventing a
 * substitute seed here would silently produce a world that does not match the save's contents.
 */
export const readGenerationManifest = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    worldSeed: number;
    referenceYear: number;
  }>`SELECT world_seed as "worldSeed", reference_year as "referenceYear" FROM generation_manifest WHERE id = 1`;
  const manifest = rows[0];
  if (!manifest) {
    return yield* Effect.die(new Error("save has no generation_manifest row"));
  }
  return manifest;
});
