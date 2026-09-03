import { BASE_CONTENT_PACK, displayName, type ContentPack, type LocaleTag } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";

/**
 * The one place a canonical id becomes a display name for a save.
 *
 * Every club and competition name the player sees comes from the content pack rather than from a
 * column, so the same generated world can run under fictional, licensed, or localized names. That
 * only holds if resolution happens exactly once: a name baked into a row at generation time is a
 * name that save can never be re-read under a different pack, and a second resolution site is a
 * second place for a pack swap to go stale. Every read path that returns a club or competition
 * name — the squad header, the club selection list, the transfer market and bid list, the match
 * screens, the fixture list, the league table — resolves here.
 *
 * Resolution is a pure function of the pack and an id, so it adds no failure to any caller's error
 * channel. An id the pack does not name resolves to the id itself, which is deliberately visible
 * in the UI: a `club_eng_07` on screen is obvious in a screenshot and reported by
 * `packCoverageGaps`, where an empty string would read as a rendering bug.
 *
 * The setup screens have their own resolution point (`catalogueName` in `@cm-clone/shared`),
 * because they run before a save exists and so have no recorded pack to read.
 */

/**
 * Every pack this build can resolve against, keyed by the id `generation_manifest` records.
 *
 * The pack is a code asset, never a table: persisting it into the save would defeat the layer's
 * whole purpose, since an existing save could then never be reopened under a localized or licensed
 * pack. A save recording a pack this build does not carry resolves against the base pack, which
 * shows the ids it cannot name rather than refusing to open the save.
 */
const PACKS: Readonly<Record<string, ContentPack>> = {
  [BASE_CONTENT_PACK.id]: BASE_CONTENT_PACK,
};

/**
 * The locale display names resolve at. There is no locale setting yet, so this is the wildcard the
 * pack must always carry; the moment one exists it is the only line that changes, and the pack's
 * locale → `"*"` → id chain is already what does the work.
 */
const APP_LOCALE: LocaleTag = "*";

/** Resolves a canonical id against a pack, at the app locale. */
export const resolveDisplayName = (pack: ContentPack, id: string): string =>
  displayName(pack, id, APP_LOCALE);

/**
 * The pack a save was generated against, read from its manifest.
 *
 * A save with no manifest row cannot exist — `generateWorld` writes it before any entity — so its
 * absence is a defect rather than a typed failure, exactly as `readGenerationManifest` treats it.
 */
export const savePack = Effect.gen(function* () {
  const sql = yield* SqlClient;
  const rows = yield* sql<{
    contentPackId: string;
  }>`SELECT content_pack_id as "contentPackId" FROM generation_manifest WHERE id = 1`;
  const row = rows[0];
  if (!row) {
    return yield* Effect.die(new Error("save has no generation_manifest row"));
  }
  return PACKS[row.contentPackId] ?? BASE_CONTENT_PACK;
});

/**
 * A resolver bound to the save's pack, for a caller that names several entities from one query.
 *
 * Callers take this once and apply it per row rather than reading the manifest per name: the pack
 * is code and the manifest is a single row, so the cost is one small read per read path.
 */
export const displayNames = Effect.gen(function* () {
  const pack = yield* savePack;
  return (id: string): string => resolveDisplayName(pack, id);
});
