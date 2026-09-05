/**
 * The world subsystem's public surface: everything that brings a save into existence and keeps its
 * identifiers readable.
 *
 * `leagueSelection` (the setup draft, presets and the nation/league intents a career is submitted
 * with), `worldGeneration` (the deterministic clubs-and-players draw those intents resolve into),
 * `saves` (the save file lifecycle that runs the two in order), and `displayNames` (the Content
 * Pack that turns generated identifiers into the names the player reads).
 */

export {
  clubColourResolver,
  displayNames,
  reportPackCoverage,
  resolveDisplayName,
  savePack,
} from "./displayNames.js";
export {
  LEAGUE_PRESETS_FILE,
  LEAGUE_SNAPSHOTS_FILE,
  SETUP_DRAFT_FILE,
  applyLeaguePreset,
  buildLeaguePresetIntents,
  getLeagueSelectionSnapshot,
  getLeagueSetupIndex,
  listLeaguePresets,
  loadSetupDraft,
  resolveLeagueSelection,
  saveLeaguePreset,
  saveSetupDraft,
  submissionKey,
  submitLeagueSelection,
  systemProfile,
  toDomainIntents,
} from "./leagueSelection.js";
export {
  DEFAULT_CAREER_INTENTS,
  beginCareer,
  commitCareer,
  createSave,
  discardCareer,
  listSaves,
  loadSave,
  type BeginCareerOptions,
  type ManagerProfileParams,
} from "./saves.js";
export {
  GENERATOR_VERSION,
  RULESET_VERSION,
  generateWorld,
  insertGeneratedSquad,
  readGenerationManifest,
  type WorldGenerationConfig,
} from "./worldGeneration.js";
