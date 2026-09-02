import { createHash, randomUUID } from "node:crypto";
import { cpus, totalmem } from "node:os";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CareerScopeEstimateView,
  CompetitionId,
  CompetitionRow,
  DependencyRow,
  EffectiveNationSelectionRow,
  InvalidLeagueSelectionError,
  LeaguePreset,
  LeagueSelectionSnapshot,
  LeagueSetupIndexView,
  NationId,
  NationRow,
  NationSelectionIntentPayload,
  PresetFingerprintMismatchError,
  RegionId,
  RegionRow,
  ResolvedSelectionView,
  ScopeOptionId,
  ScopeOptionRow,
  SelectionIssueRow,
  SetupDraft,
  SetupDraftWriteError,
  SnapshotId,
} from "@cm-clone/contracts";
import {
  applyStoredIntents,
  blockingIssues,
  buildPreset,
  estimateCareerScope,
  estimateIssues,
  LEAGUE_SETUP_INDEX,
  resolveSelection,
  sanitizeLabel,
  type BuiltInPreset,
  type CareerScopeEstimate,
  type NationSelectionIntent,
  type ResolvedSelection,
  type SystemCapabilityProfile,
} from "@cm-clone/shared";
import { Effect, Schema } from "effect";

/**
 * The New Career Setup application service for League and Nation Selection (Screen 3, §22).
 *
 * This module is the trust boundary. `@cm-clone/shared` holds the pure resolver, estimator, and
 * validator; this file owns everything they deliberately do not — reading the machine's
 * capability, persisting drafts, presets, and snapshots, and turning catalogue values into the
 * sanitized read models the renderer receives.
 *
 * Nothing the renderer sends is trusted. Every RPC re-resolves from intents against the catalogue
 * rather than accepting a resolved selection, so a forged, stale, or replayed payload produces
 * blocking issues instead of a career whose scope nobody validated (§23).
 *
 * Persistence lives in Electron `userData` beside `keybindings.json`, and is owned here exactly as
 * `saves.ts` owns the `.sqlite` files: pre-career setup state is machine-local, never enters a
 * save, and never reaches a migration.
 */

export const SETUP_DRAFT_FILE = "setup-draft.json";
export const LEAGUE_PRESETS_FILE = "league-presets.json";
export const LEAGUE_SNAPSHOTS_FILE = "league-snapshots.json";

// ---------------------------------------------------------------------------
// System capability (§11.3)
// ---------------------------------------------------------------------------

/**
 * What this machine can carry, as the estimator's two inputs. The performance index is a coarse
 * core count ratio against a four-core reference, deliberately not a benchmark: §11.4 forbids
 * implying a precision the model does not have, and the rating it feeds is categorical.
 */
export const systemProfile = Effect.sync(
  (): SystemCapabilityProfile => ({
    totalMemoryBytes: totalmem(),
    performanceIndex: Math.max(cpus().length / 4, 0.25),
  }),
);

// ---------------------------------------------------------------------------
// Read model (§23 — labels are sanitized exactly once, here)
// ---------------------------------------------------------------------------

const toCompetitionRow = (competition: {
  readonly id: string;
  readonly nationId: string;
  readonly name: string;
  readonly kind: "league" | "cup" | "reserve" | "continental";
  readonly tier: number | null;
  readonly requires: readonly string[];
  readonly clubCount: number;
  readonly annualMatches: number;
  readonly playableSupported: boolean;
}): CompetitionRow =>
  new CompetitionRow({
    id: CompetitionId.make(competition.id),
    nationId: NationId.make(competition.nationId),
    name: sanitizeLabel(competition.name),
    kind: competition.kind,
    tier: competition.tier,
    requires: competition.requires.map((id) => CompetitionId.make(id)),
    clubCount: competition.clubCount,
    annualMatches: competition.annualMatches,
    playableSupported: competition.playableSupported,
  });

/** The catalogue as the renderer sees it. Built fresh per call rather than memoized: it is a
 *  dozen Nations, and a cached read model is a second place for a database swap to go stale. */
export const getLeagueSetupIndex = Effect.sync(
  () =>
    new LeagueSetupIndexView({
      fingerprint: LEAGUE_SETUP_INDEX.fingerprint,
      databaseName: sanitizeLabel(LEAGUE_SETUP_INDEX.databaseName),
      databaseVersion: sanitizeLabel(LEAGUE_SETUP_INDEX.databaseVersion),
      regions: LEAGUE_SETUP_INDEX.regions.map(
        (region) =>
          new RegionRow({ id: RegionId.make(region.id), name: sanitizeLabel(region.name) }),
      ),
      nations: LEAGUE_SETUP_INDEX.nations.map(
        (nation) =>
          new NationRow({
            id: NationId.make(nation.id),
            // Not sanitized: both are closed vocabularies from the catalogue, not display labels.
            code: nation.code,
            confederationId: nation.confederationId,
            regionId: RegionId.make(nation.regionId),
            name: sanitizeLabel(nation.name),
            alternativeNames: nation.alternativeNames.map((name) => sanitizeLabel(name)),
            available: nation.available,
            playableSupported: nation.playableSupported,
            recommendedScopeOptionId:
              nation.recommendedScopeOptionId === null
                ? null
                : ScopeOptionId.make(nation.recommendedScopeOptionId),
            scopeOptions: nation.scopeOptions.map(
              (option) =>
                new ScopeOptionRow({
                  id: ScopeOptionId.make(option.id),
                  nationId: NationId.make(option.nationId),
                  displayName: sanitizeLabel(option.displayName),
                  playableCompetitionIds: option.playableCompetitionIds.map((id) =>
                    CompetitionId.make(id),
                  ),
                  backgroundCompetitionIds: option.backgroundCompetitionIds.map((id) =>
                    CompetitionId.make(id),
                  ),
                }),
            ),
            competitions: nation.competitions.map((competition) => toCompetitionRow(competition)),
          }),
      ),
    }),
);

// ---------------------------------------------------------------------------
// Resolution (§11, §12, §15)
// ---------------------------------------------------------------------------

/** Wire intents in, domain intents out. The brands come off here because the pure resolver takes
 *  plain strings — it validates them against the catalogue, which is the actual check. Exported
 *  because generation's snapshot handling re-resolves the same intents through the same
 *  conversion. */
export const toDomainIntents = (
  intents: readonly NationSelectionIntentPayload[],
): readonly NationSelectionIntent[] =>
  intents.map((intent) => ({
    nationId: intent.nationId as string,
    mode: intent.mode,
    ...(intent.scopeOptionId === undefined ? {} : { scopeOptionId: intent.scopeOptionId as string }),
    source: intent.source,
  }));

const toEstimateView = (estimate: CareerScopeEstimate): CareerScopeEstimateView =>
  new CareerScopeEstimateView({ ...estimate });

const toIssueRows = (
  resolved: ResolvedSelection,
  estimate: CareerScopeEstimate,
): readonly SelectionIssueRow[] =>
  [...resolved.issues, ...estimateIssues(estimate)].map(
    (entry) =>
      new SelectionIssueRow({
        code: entry.code,
        level: entry.level,
        message: entry.message,
        nationId: entry.nationId === null ? null : NationId.make(entry.nationId),
        competitionIds: entry.competitionIds.map((id) => CompetitionId.make(id)),
      }),
  );

const toSelectionRows = (resolved: ResolvedSelection): readonly EffectiveNationSelectionRow[] =>
  resolved.selections.map(
    (selection) =>
      new EffectiveNationSelectionRow({
        nationId: NationId.make(selection.nationId),
        mode: selection.mode,
        ...(selection.scopeOptionId === undefined
          ? {}
          : { scopeOptionId: ScopeOptionId.make(selection.scopeOptionId) }),
        playableCompetitionIds: selection.playableCompetitionIds.map((id) => CompetitionId.make(id)),
        backgroundCompetitionIds: selection.backgroundCompetitionIds.map((id) =>
          CompetitionId.make(id),
        ),
        viewOnlyCompetitionIds: selection.viewOnlyCompetitionIds.map((id) => CompetitionId.make(id)),
        dependencyCompetitionIds: selection.dependencyCompetitionIds.map((id) =>
          CompetitionId.make(id),
        ),
      }),
  );

const toDependencyRows = (resolved: ResolvedSelection): readonly DependencyRow[] =>
  resolved.dependencies.map(
    (record) =>
      new DependencyRow({
        competitionId: CompetitionId.make(record.competitionId),
        mode: record.mode,
        requiredBy: record.requiredBy.map((id) => CompetitionId.make(id)),
        chosenDirectly: record.chosenDirectly,
      }),
  );

/**
 * Resolve, estimate, and validate one intent set.
 *
 * Never fails: an invalid selection is a *value* carrying blocking issues, because the screen has
 * to render exactly those issues. The failure channel is reserved for `submitLeagueSelection`,
 * where refusing is the outcome rather than the display.
 *
 * The echoed `selectionRevision` is the whole of the §11.5 staleness contract on this side — main
 * holds no per-client state, so two overlapping requests are simply two answers, and the renderer
 * keeps the one whose revision it is still waiting for.
 */
export const resolveLeagueSelection = (
  selectionRevision: number,
  intents: readonly NationSelectionIntentPayload[],
): Effect.Effect<ResolvedSelectionView> =>
  Effect.gen(function* () {
    const profile = yield* systemProfile;
    const resolved = resolveSelection(LEAGUE_SETUP_INDEX, toDomainIntents(intents));
    const estimate = estimateCareerScope(LEAGUE_SETUP_INDEX, resolved, profile);
    return new ResolvedSelectionView({
      selectionRevision,
      selections: toSelectionRows(resolved),
      dependencies: toDependencyRows(resolved),
      issues: toIssueRows(resolved, estimate),
      estimate: toEstimateView(estimate),
    });
  });

// ---------------------------------------------------------------------------
// Machine-local JSON stores
// ---------------------------------------------------------------------------

/**
 * Tolerant read: a corrupt, truncated, or hand-edited file reads as absent and is overwritten on
 * the next write, exactly as `keybindings.ts` treats its own file. A setup draft is a convenience;
 * losing one must never be a startup error.
 */
const readJsonFile = (file: string): Effect.Effect<unknown> =>
  Effect.promise(() => readFile(file, "utf8").catch(() => "")).pipe(
    Effect.map((text) => {
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return null;
      }
    }),
  );

/**
 * Write through a temporary file and rename. §31.8 asks that closing the application during draft
 * persistence not corrupt the draft: a rename is atomic on both platforms this ships to, so a
 * process killed mid-write leaves either the old draft or the new one, never half of either.
 */
const writeJsonFile = (
  userDataDir: string,
  file: string,
  value: unknown,
): Effect.Effect<void, SetupDraftWriteError> =>
  Effect.tryPromise({
    try: async () => {
      await mkdir(userDataDir, { recursive: true });
      const target = path.join(userDataDir, file);
      const temporary = `${target}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
      await rename(temporary, target);
    },
    catch: (cause) => new SetupDraftWriteError({ reason: String(cause) }),
  });

// ---------------------------------------------------------------------------
// Setup draft (§18, §29)
// ---------------------------------------------------------------------------

export const saveSetupDraft = (
  userDataDir: string,
  draft: {
    readonly intents: readonly NationSelectionIntentPayload[];
    readonly searchQuery: string;
    readonly regionFilterId: string | null;
    readonly statusFilter: string;
  },
): Effect.Effect<void, SetupDraftWriteError> =>
  writeJsonFile(userDataDir, SETUP_DRAFT_FILE, {
    databaseFingerprint: LEAGUE_SETUP_INDEX.fingerprint,
    savedAt: new Date().toISOString(),
    intents: draft.intents,
    searchQuery: draft.searchQuery,
    regionFilterId: draft.regionFilterId,
    statusFilter: draft.statusFilter,
  });

/**
 * The stored draft, or `null`.
 *
 * A draft whose fingerprint no longer matches is discarded *here* rather than handed up for the
 * renderer to judge — §6.3 refuses to restore across a database change, and leaving the decision
 * at the boundary means there is one place it can be got wrong. A draft that decodes but names
 * Nations the catalogue has since lost is filtered by `applyStoredIntents` on the same pass, so
 * what the renderer receives is always applicable as-is.
 */
export const loadSetupDraft = (
  userDataDir: string,
): Effect.Effect<SetupDraft | null> =>
  Effect.gen(function* () {
    const raw = yield* readJsonFile(path.join(userDataDir, SETUP_DRAFT_FILE));
    const decoded = yield* Schema.decodeUnknownEffect(SetupDraft)(raw).pipe(Effect.option);
    if (decoded._tag === "None") return null;

    const draft = decoded.value;
    const applied = applyStoredIntents(
      LEAGUE_SETUP_INDEX,
      draft.databaseFingerprint,
      toDomainIntents(draft.intents),
    );
    if (!applied.fingerprintMatches) return null;

    return new SetupDraft({
      ...draft,
      intents: applied.intents.map((intent) => toIntentPayload(intent)),
    });
  });

const toIntentPayload = (intent: NationSelectionIntent): NationSelectionIntentPayload =>
  new NationSelectionIntentPayload({
    nationId: NationId.make(intent.nationId),
    mode: intent.mode,
    ...(intent.scopeOptionId === undefined
      ? {}
      : { scopeOptionId: ScopeOptionId.make(intent.scopeOptionId) }),
    source: intent.source,
  });

// ---------------------------------------------------------------------------
// Presets (§13)
// ---------------------------------------------------------------------------

export const buildLeaguePresetIntents = (
  preset: BuiltInPreset,
): Effect.Effect<{
  readonly intents: readonly NationSelectionIntentPayload[];
  readonly estimate: CareerScopeEstimateView;
}> =>
  Effect.gen(function* () {
    const profile = yield* systemProfile;
    const intents = buildPreset(LEAGUE_SETUP_INDEX, preset, profile);
    const resolved = resolveSelection(LEAGUE_SETUP_INDEX, intents);
    return {
      intents: intents.map((intent) => toIntentPayload(intent)),
      estimate: toEstimateView(estimateCareerScope(LEAGUE_SETUP_INDEX, resolved, profile)),
    };
  });

const readPresets = (userDataDir: string): Effect.Effect<readonly LeaguePreset[]> =>
  Effect.gen(function* () {
    const raw = yield* readJsonFile(path.join(userDataDir, LEAGUE_PRESETS_FILE));
    const decoded = yield* Schema.decodeUnknownEffect(Schema.Array(LeaguePreset))(raw).pipe(
      Effect.option,
    );
    return decoded._tag === "None" ? [] : decoded.value;
  });

/** Only presets captured against the current database are offered: §13 would rather show fewer
 *  presets than offer one that will be refused the moment it is clicked. */
export const listLeaguePresets = (userDataDir: string): Effect.Effect<readonly LeaguePreset[]> =>
  readPresets(userDataDir).pipe(
    Effect.map((presets) =>
      presets.filter((preset) => preset.databaseFingerprint === LEAGUE_SETUP_INDEX.fingerprint),
    ),
  );

export const saveLeaguePreset = (
  userDataDir: string,
  name: string,
  intents: readonly NationSelectionIntentPayload[],
): Effect.Effect<LeaguePreset, SetupDraftWriteError> =>
  Effect.gen(function* () {
    const existing = yield* readPresets(userDataDir);
    const preset = new LeaguePreset({
      id: randomUUID(),
      name: sanitizeLabel(name),
      databaseFingerprint: LEAGUE_SETUP_INDEX.fingerprint,
      savedAt: new Date().toISOString(),
      intents,
    });
    yield* writeJsonFile(userDataDir, LEAGUE_PRESETS_FILE, [...existing, preset]);
    return preset;
  });

/**
 * §13, §31.4. Apply a stored preset.
 *
 * A fingerprint mismatch fails outright — never a partial application, and never a guess at which
 * current Competition replaced a missing one. Entries the current catalogue no longer contains are
 * dropped and *named* in the result, so the screen can say what it discarded rather than silently
 * applying less than the user asked for.
 */
export const applyLeaguePreset = (
  userDataDir: string,
  id: string,
): Effect.Effect<
  {
    readonly intents: readonly NationSelectionIntentPayload[];
    readonly droppedNationIds: readonly string[];
    readonly droppedScopeOptionIds: readonly string[];
  },
  PresetFingerprintMismatchError
> =>
  Effect.gen(function* () {
    const presets = yield* readPresets(userDataDir);
    const preset = presets.find((entry) => entry.id === id);
    if (preset === undefined) {
      return yield* new PresetFingerprintMismatchError({
        expected: LEAGUE_SETUP_INDEX.fingerprint,
        found: "(preset not found)",
      });
    }
    const applied = applyStoredIntents(
      LEAGUE_SETUP_INDEX,
      preset.databaseFingerprint,
      toDomainIntents(preset.intents),
    );
    if (!applied.fingerprintMatches) {
      return yield* new PresetFingerprintMismatchError({
        expected: LEAGUE_SETUP_INDEX.fingerprint,
        found: preset.databaseFingerprint,
      });
    }
    return {
      intents: applied.intents.map((intent) => toIntentPayload(intent)),
      droppedNationIds: applied.droppedNationIds,
      droppedScopeOptionIds: applied.droppedScopeOptionIds,
    };
  });

// ---------------------------------------------------------------------------
// Snapshots (§17)
// ---------------------------------------------------------------------------

/**
 * The idempotency key for §17.2. Two `Continue` activations carrying the same intents against the
 * same database are the same submission, so they must produce the same snapshot rather than two.
 *
 * Intents are canonicalized — sorted by Nation, reduced to the three fields that affect the
 * outcome — before hashing, so a reordered but equivalent payload still collides. `source` is
 * excluded deliberately: the same scope reached through a preset and through clicking is one
 * career scope, and treating them as different submissions would defeat the guard.
 */
export const submissionKey = (intents: readonly NationSelectionIntentPayload[]): string => {
  const canonical = [...intents]
    .filter((intent) => intent.mode !== "not_loaded")
    .map((intent) => `${intent.nationId}:${intent.mode}:${intent.scopeOptionId ?? ""}`)
    .sort()
    .join("|");
  return createHash("sha256")
    .update(`${LEAGUE_SETUP_INDEX.fingerprint}\n${canonical}`)
    .digest("hex");
};

interface StoredSnapshots {
  readonly [key: string]: unknown;
}

const readSnapshots = (userDataDir: string): Effect.Effect<Record<string, unknown>> =>
  readJsonFile(path.join(userDataDir, LEAGUE_SNAPSHOTS_FILE)).pipe(
    Effect.map((raw) =>
      typeof raw === "object" && raw !== null && !Array.isArray(raw)
        ? (raw as StoredSnapshots as Record<string, unknown>)
        : {},
    ),
  );

/**
 * `Continue` (§17).
 *
 * Revalidates from the intents — nothing the renderer resolved is trusted — and refuses with the
 * blocking issues when the selection does not survive. On success it creates one immutable
 * snapshot, keyed by `submissionKey` so a duplicate activation returns the first snapshot rather
 * than minting a second (AC-13).
 *
 * A snapshot that cannot be persisted is still returned: the snapshot is the contract with the
 * next setup stage, and failing the whole submission because a convenience cache could not be
 * written would strand the user on a valid selection.
 */
export const submitLeagueSelection = (
  userDataDir: string,
  intents: readonly NationSelectionIntentPayload[],
): Effect.Effect<LeagueSelectionSnapshot, InvalidLeagueSelectionError> =>
  Effect.gen(function* () {
    const profile = yield* systemProfile;
    const resolved = resolveSelection(LEAGUE_SETUP_INDEX, toDomainIntents(intents));
    const estimate = estimateCareerScope(LEAGUE_SETUP_INDEX, resolved, profile);
    const issues = toIssueRows(resolved, estimate);
    const blocking = blockingIssues([...resolved.issues, ...estimateIssues(estimate)]);

    if (blocking.length > 0) {
      return yield* new InvalidLeagueSelectionError({
        issues: issues.filter((entry) => entry.level === "blocking"),
      });
    }

    const key = submissionKey(intents);
    const stored = yield* readSnapshots(userDataDir);
    const existing = yield* Schema.decodeUnknownEffect(LeagueSelectionSnapshot)(stored[key]).pipe(
      Effect.option,
    );
    if (existing._tag === "Some") return existing.value;

    const snapshot = new LeagueSelectionSnapshot({
      id: SnapshotId.make(randomUUID()),
      databaseFingerprint: LEAGUE_SETUP_INDEX.fingerprint,
      createdAt: new Date().toISOString(),
      intents,
      selections: toSelectionRows(resolved),
      dependencies: toDependencyRows(resolved),
      estimate: toEstimateView(estimate),
    });

    // A failed write costs the idempotency guard and the next stage's lookup, not the submission.
    // Logged rather than swallowed: a disk that cannot hold the snapshot is worth a diagnostic
    // even though it is not worth refusing a valid selection over.
    yield* writeJsonFile(userDataDir, LEAGUE_SNAPSHOTS_FILE, { ...stored, [key]: snapshot }).pipe(
      Effect.tapError((error) =>
        Effect.logWarning(`league selection snapshot could not be persisted: ${error.reason}`),
      ),
      Effect.catchTag("SetupDraftWriteError", () => Effect.void),
    );
    return snapshot;
  });

export const getLeagueSelectionSnapshot = (
  userDataDir: string,
  id: SnapshotId,
): Effect.Effect<LeagueSelectionSnapshot | null> =>
  Effect.gen(function* () {
    const stored = yield* readSnapshots(userDataDir);
    for (const value of Object.values(stored)) {
      const decoded = yield* Schema.decodeUnknownEffect(LeagueSelectionSnapshot)(value).pipe(
        Effect.option,
      );
      if (decoded._tag === "Some" && decoded.value.id === id) return decoded.value;
    }
    return null;
  });
