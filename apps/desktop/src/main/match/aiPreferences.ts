/**
 * The AI clubs' in-match preferences, which steer the AI side's mid-match tactical changes. They are
 * an input to `deriveMatchEvents` like the seed and the command journal: every reader that re-derives
 * a match's timeline must pass them, or it replays a different match from the one the manager
 * watched — a different score committed, different statistics, a different report.
 */
import type { ClubId } from "@cm-clone/contracts";
import { aiTacticPreferences, type AiTacticalPreferences, type StatureTier } from "@cm-clone/shared";
import { Effect } from "effect";
import { SqlClient } from "effect/unstable/sql/SqlClient";
import { readGenerationManifest } from "../world/worldGeneration.js";
import type { StreamEvent } from "../season/decider.js";
import { deriveMatchEvents, matchStartedOf } from "./stream.js";

/** The preferences of the match's non-user clubs, keyed by club; the manager's club has none. */
export const matchAiPreferences = (stream: ReadonlyArray<StreamEvent>) =>
  Effect.gen(function* () {
    const sql = yield* SqlClient;
    const manifest = yield* readGenerationManifest;
    const started = matchStartedOf(stream);
    const rows = yield* sql<{ readonly id: ClubId; readonly isUserClub: number; readonly statureTier: StatureTier }>`
      SELECT id, is_user_club as "isUserClub", stature_tier as "statureTier" FROM clubs
      WHERE id IN (${started.homeClubId}, ${started.awayClubId})`;
    const prefs = new Map<ClubId, AiTacticalPreferences>();
    for (const row of rows) {
      if (row.isUserClub === 1) continue;
      prefs.set(row.id, aiTacticPreferences(manifest.worldSeed, row.id, row.statureTier));
    }
    return prefs as ReadonlyMap<ClubId, AiTacticalPreferences>;
  });

/** `deriveMatchEvents` over a persisted stream, with the AI preferences it was played under. */
export const deriveStreamEvents = (stream: ReadonlyArray<StreamEvent>) =>
  Effect.gen(function* () {
    const prefs = yield* matchAiPreferences(stream);
    return deriveMatchEvents(stream, prefs);
  });
