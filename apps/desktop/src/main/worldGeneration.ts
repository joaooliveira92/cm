import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { ClubId, PlayerId, type SnapshotId } from "@cm-clone/contracts";
import {
  BASE_CONTENT_PACK,
  CITIES,
  LEAGUE_SETUP_INDEX,
  NATION_CODES,
  NATION_PROFILES,
  canonicalCityId,
  canonicalClubId,
  canonicalNationId,
  createSeededRng,
  deriveId,
  deriveSeed,
  drawHometown,
  drawStadiumCapacity,
  drawStadiumName,
  statureTiersFor,
  generateSquad,
  nationCodeFromId,
  type ClubStrength,
  type GeneratedPlayer,
  type ResolvedWorld,
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
 * canonical id, and each player derives theirs from their club's seed and their squad slot. So
 * adding a club moves only that club's squad; with a single running stream every entity after the
 * change would shift. Keying on the canonical id rather than on a display name is what keeps a
 * world stable across a change of content pack: renaming a club under a licensed pack must not
 * regenerate its squad.
 */

/** The season a generated world starts in. Membership for later seasons is written by the
 *  rollover, never here. */
const FIRST_SEASON = 1;

/** Bumped when the generation *code* changes shape in a way that alters output. */
export const GENERATOR_VERSION = "1.0.0";

/** Bumped when the generation *data* or its interpretation changes (squad demand, ability bands,
 *  club roster). Together with the world seed this identifies a world exactly.
 *
 *  2.0.0: clubs are generated per competition with canonical ids, Stature Tier became a
 *  per-competition quota, squad quality became a function of tier and nation prior, and players
 *  gained a nationality and a birthplace drawn before their name. Every one of those changes moves
 *  what a given world seed produces, so a 1.0.0 save and a 2.0.0 save from the same seed are
 *  different worlds and the version is what says so. */
export const RULESET_VERSION = "2.0.0";

export interface WorldGenerationConfig {
  readonly worldSeed: number;
  /** The season year player ages are measured against. Pinned per save, never read from the clock,
   *  so a world regenerated in a later year is still the same world. */
  readonly referenceYear: number;
  /** The League Selection Snapshot this world is generated on behalf of. Recorded in the manifest
   *  as provenance only: what the selection *resolved to* arrives as `world` below, already
   *  re-resolved against the live catalogue by `beginCareer`. */
  readonly snapshotId: SnapshotId;
  /** The resolved world — the competitions the Effective Selection activated, with the promotion
   *  structure and cup entry structure that connect them. Generation writes exactly these and no
   *  others; a competition resolved to `not_loaded` is simply absent. */
  readonly world: ResolvedWorld;
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
export const generateWorld = ({ worldSeed, referenceYear, snapshotId, world }: WorldGenerationConfig) =>
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

    // The competition graph: the resolved world, activated-only. Written after the catalogue —
    // a competition references a nation — and before any club, since a club's competition is what
    // later tickets mint its id from. Nothing here reads a seed or a collection length: these rows
    // are a function of the selection alone, which is what makes two saves from one selection
    // carry an identical graph whatever their seeds.
    for (const competition of world.competitions) {
      yield* sql`INSERT INTO competitions (id, nation_id, kind, tier, depth, club_count)
        VALUES (${competition.id}, ${competition.nationId}, ${competition.kind}, ${competition.tier}, ${competition.depth}, ${competition.clubCount})`;
    }

    // Both structural relations are already filtered to links whose endpoints are both loaded, so
    // every row written here names two competitions that have rows in this save. A dangling
    // endpoint would be a resolver defect rather than a condition to handle: `resolveWorld` closes
    // the world at the edge of the chosen scope before generation ever runs.
    for (const link of world.links) {
      yield* sql`INSERT INTO competition_links (higher_competition_id, lower_competition_id, slots)
        VALUES (${link.higherCompetitionId}, ${link.lowerCompetitionId}, ${link.slots})`;
    }

    for (const entrant of world.entrants) {
      yield* sql`INSERT INTO competition_entrants (cup_competition_id, source_competition_id)
        VALUES (${entrant.cupCompetitionId}, ${entrant.sourceCompetitionId})`;
    }

    // One club per slot of every competition's club count. Nothing here reads a running counter,
    // a collection length, or a position in an iteration over the clubs being generated: a club is
    // a pure function of its own canonical id and the world seed. That is what buys the superset
    // property — the same seed under a broader selection reproduces the narrower world exactly and
    // adds to it — and it is the property a single `index` variable would silently destroy.
    for (const competition of world.competitions) {
      if (competition.clubCount === null) continue;
      const nationCode = competition.nationId === null ? null : nationCodeFromId(competition.nationId);
      if (nationCode === null) continue;

      // The competition's clubs and their seeds, both a function of the catalogue's `clubCount`
      // alone, so this list is identical in every save that loads this competition.
      const clubSeeds = Array.from({ length: competition.clubCount }, (_, slot) => {
        const clubId = canonicalClubId(competition.id, slot + 1);
        return { clubId, seed: deriveSeed(worldSeed, "club", clubId) };
      });
      const statureTiers = statureTiersFor(clubSeeds);

      for (const { clubId: id, seed: clubSeed } of clubSeeds) {
        const clubId = ClubId.make(id);
        // One stream per club, drawn from the club's own seed, so a club's home town and ground
        // never depend on how many clubs were generated before it.
        const clubRandom = createSeededRng(clubSeed);

        const strength: ClubStrength = {
          tier: competition.tier,
          nationPrior: NATION_PROFILES[nationCode].footballImportance,
          statureTier: statureTiers.get(id) ?? "small",
        };
        const hometown = drawHometown(nationCode, clubRandom);
        const stadiumName = drawStadiumName(clubRandom);
        const stadiumCapacity = drawStadiumCapacity(strength, clubRandom);

        yield* sql`INSERT INTO clubs (id, stature_tier, is_user_club, generation_seed, city_id, stadium_name, stadium_capacity)
          VALUES (${clubId}, ${strength.statureTier}, 0, ${clubSeed},
            ${canonicalCityId(hometown.nationCode, hometown.name)}, ${stadiumName}, ${stadiumCapacity})`;

        // The club's membership, and the only record of it. Season 1's participant row is also the
        // club's *generated home* — permanently, since the row is never rewritten — which is why no
        // column on `clubs` names a competition. The standings columns stay NULL until the season
        // concludes and the rollover freezes them.
        yield* sql`INSERT INTO competition_participants (competition_id, season_number, club_id)
          VALUES (${competition.id}, ${FIRST_SEASON}, ${clubId})`;

        // Simulation Depth's entire footprint on disk: whether the five tables beneath a club have
        // rows in them. Nothing above is conditional — a `results-only` club has the same columns,
        // the same hometown, and the same ground as any other, so a club becoming manageable needs
        // no conversion of its own row. What stands in for its squad is Results Strength, derived
        // on read from this club's id and its competition's shape.
        if (competition.depth === "results-only") continue;

        const squad = generateSquad(strength, {
          referenceYear,
          clubNation: nationCode,
          randomForSlot: (slot) => createSeededRng(deriveSeed(clubSeed, "player", slot.index)),
        });

        yield* insertGeneratedSquad(clubId, squad, clubSeed);
      }
    }
  });


/**
 * Writes one generated squad: the player rows and their position familiarities.
 *
 * Shared by world generation and by the rollover that conjures a squad for a club promoted out of a
 * `results-only` division, so the two produce byte-identical shapes — a promoted club's players are
 * not a second kind of player. The seed is supplied by the caller because the two differ in exactly
 * one respect: a rollover squad keys on the season as well as the slot, so a club promoted twice
 * does not get the same eleven back.
 */
export const insertGeneratedSquad = (
  clubId: ClubId,
  squad: ReadonlyArray<GeneratedPlayer & { readonly slot: { readonly index: number } }>,
  /** What the squad's per-player seeds and ids derive from. World generation passes the club seed;
   *  the rollover passes a seed that also keys on the season, so a club promoted twice does not get
   *  the same eleven back. */
  baseSeed: number,
) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    for (const generated of squad) {
      const playerSeed = deriveSeed(baseSeed, "player", generated.slot.index);
      const playerId = PlayerId.make(deriveId(baseSeed, "player", generated.slot.index));
      const a = generated.attributes;

      yield* sql`INSERT INTO players (
        id, club_id, first_name, last_name, date_of_birth, potential_ability, nationality, birth_city_id,
        passing, shooting, tackling, dribbling, heading, crossing, finishing, first_touch,
        positioning, decisions, composure, determination, teamwork, flair, bravery, aggression,
        pace, acceleration, stamina, strength, agility, natural_fitness, injury_proneness,
        gk_handling, gk_reflexes, gk_aerial_reach, gk_command_of_area, gk_kicking,
        squad_slot, generation_seed
      ) VALUES (
        ${playerId}, ${clubId}, ${generated.firstName}, ${generated.lastName}, ${generated.dateOfBirth}, ${generated.potentialAbility},
        ${canonicalNationId(generated.nationality)},
        ${generated.birthCity === null ? null : canonicalCityId(generated.birthCity.nationCode, generated.birthCity.name)},
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
