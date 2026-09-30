/**
 * The CM 03/04-style Set Instructions panel: the right-side pane when the Tactics screen is in
 * Set Instructions mode. Two sub-modes: Team (the nine Team Instructions and team set-piece
 * instructions) and Player (per-slot overrides, standalone settings, switches, Set To Preset and
 * set-piece roles). Every control is a tick box enabling a dropdown, exactly as CM renders them.
 */
import { useCallback, useMemo, useState } from "react";
import { Tactic, type SquadPlayerView } from "@cm-clone/contracts";
import {
  PLAYER_OVERRIDE_VALUES,
  PLAYER_STANDALONE_VALUES,
  PLAYER_SWITCHES,
  TEAM_INSTRUCTION_VALUES,
  TEAM_SWITCHES,
  TEAM_SET_PIECE_VALUES,
  SET_PIECE_ROLE_VALUES,
  INSTRUCTION_TEMPLATES,
  applyInstructionTemplate,
  slotLabel,
  STARTER_COUNT,
  type PlayerInstructions,
  type PlayerSwitch,
  type TeamInstructions,
  type TeamSwitch,
  type Slot,
  type INSTRUCTION_TEMPLATE_VALUES,
} from "@cm-clone/shared";
import { ACTIONS_ROW_BUTTON_CLASS } from "../squad/actionsRowClasses.js";
import { FOCUS_RING } from "../focus.js";

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** CamelCase to Title Case with spaces. */
const displayName = (key: string): string =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

/** Value id to display string, eg "bothFlanks" → "Down Both Flanks", "ownHalfOnly" → "Own Half Only". */
const displayValue = (key: string): string =>
  key
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/([A-Z])/g, " $1")
    .trim();

/** The human-readable labels for the seven switches when ticked, from CM's own XML hint text. */
const SWITCH_HINTS: Record<PlayerSwitch, string> = {
  crossBall: "Player will attempt more crosses",
  longShots: "Encourage shots from long range",
  forwardRuns: "Encourage attacking runs",
  runWithBall: "Player will run with the ball more",
  tryThroughBalls: "Encourage more through balls",
  freeRole: "Player will roam around the pitch",
  holdUpBall: "Player will hold up ball more",
};

/** The team-level "unticked" placeholder for each choice-valued team instruction. */
const TEAM_PLACEHOLDER: Record<keyof typeof TEAM_INSTRUCTION_VALUES, string> = {
  passing: "(mixed)",
  focusPassing: "(mixed)",
  tackling: "(normal)",
  closingDown: "(default)",
  mentality: "(default)",
};

/** The team-level "tick box hint" for each choice-valued team instruction. */
const TEAM_TICK_HINT: Record<keyof typeof TEAM_INSTRUCTION_VALUES, string> = {
  passing: "Tick to specify passing type",
  focusPassing: "Tick to specify where to focus passes",
  tackling: "Tick to specify tackling type",
  closingDown: "Tick to set pressing level",
  mentality: "Tick to set attacking or defensive mentality",
};

/** The team-level switch hint text when enabled. */
const TEAM_SWITCH_HINTS: Record<TeamSwitch, string> = {
  offsideTrap: "Will play the offside trap",
  zonalMarking: "Players will not man mark",
  counterAttack: "Exploit any break for quick attacks",
  menBehindTheBall: "Everyone sit in front of your area",
};

/** The team-level switch UI labels. */
const TEAM_SWITCH_LABELS: Record<TeamSwitch, string> = {
  offsideTrap: "Offside Trap",
  zonalMarking: "Zonal Marking",
  counterAttack: "Counter Attack",
  menBehindTheBall: "Men Behind The Ball",
};

/** The template names for the Set To Preset button, as CM labels them. */
const TEMPLATE_LABEL: Record<string, string> = {
  goalkeeper: "Goalkeeper",
  centralDefender: "Central Defender",
  fullBack: "Full Back",
  defensiveMidfielder: "Defensive Midfielder",
  attackingMidfielder: "Attacking Midfielder",
  winger: "Winger",
  striker: "Striker",
};

/** One set-piece role's display name. */
const setPieceRoleDisplay = (key: string): string =>
  key
    .replace(/^[a-z]/, (c) => c.toUpperCase())
    .replace(/([A-Z])/g, " $1")
    .trim();

/** The hint text for each set-piece role group. */
const SET_PIECE_HINTS: Record<string, string> = {
  defendFreeKick: "Defend Free Kicks",
  attackFreeKick: "Attack Free Kicks",
  defendCorner: "Defend Corners",
  attackCorner: "Attack Corners",
  attackingThrowInLeft: "Attacking Throw-ins (Left)",
  attackingThrowInRight: "Attacking Throw-ins (Right)",
};

/** The six set-piece role keys in the order CM shows them. */
const SET_PIECE_ORDER: ReadonlyArray<string> = [
  "defendFreeKick",
  "attackFreeKick",
  "defendCorner",
  "attackCorner",
  "attackingThrowInLeft",
  "attackingThrowInRight",
];

// ---------------------------------------------------------------------------
// Value-to-display map
// ---------------------------------------------------------------------------

const valueDisplay = (options: ReadonlyArray<string>): Record<string, string> =>
  Object.fromEntries(options.map((v) => [v, displayValue(v)]));

const OVERRIDE_DISPLAY: Record<string, string> = {
  ...valueDisplay(PLAYER_OVERRIDE_VALUES.passing),
  ...valueDisplay(PLAYER_OVERRIDE_VALUES.closingDown),
  ...valueDisplay(PLAYER_OVERRIDE_VALUES.tackling),
  ...valueDisplay(PLAYER_OVERRIDE_VALUES.marking),
  ...valueDisplay(PLAYER_OVERRIDE_VALUES.mentality),
};

const STANDALONE_DISPLAY: Record<string, string> = {
  ...valueDisplay(PLAYER_STANDALONE_VALUES.distribution),
  ...valueDisplay(PLAYER_STANDALONE_VALUES.crossFrom),
  ...valueDisplay(PLAYER_STANDALONE_VALUES.crossAim),
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TICK_CLASS = "h-4 w-4 accent-amber-500 cursor-pointer";

/** A choice-valued instruction row: a tick box + label + dropdown. Unticked shows the placeholder. */
const InstructionChoiceRow = ({
  label,
  placeholder,
  hint,
  values,
  currentValue,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly placeholder: string;
  readonly hint: string;
  readonly values: ReadonlyArray<string>;
  readonly currentValue: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) => {
  // "is ticked" = the value is NOT the first (placeholder) value
  const isTicked = currentValue !== values[0];
  const displayOptions = useMemo(() => values.slice(1), [values]);

  return (
    <div className="flex items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={isTicked}
        onChange={() => onChange(isTicked ? values[0]! : values[1]!)}
        className={TICK_CLASS}
        aria-label={hint}
        disabled={disabled}
      />
      <label className="min-w-28 text-body text-foreground">{label}</label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border border-border bg-surface px-2 py-0.5 text-body ${
          isTicked ? "text-foreground" : "text-text-muted italic"
        } ${FOCUS_RING.join(" ")}`}
        disabled={!isTicked || disabled}
        aria-label={label}
      >
        {isTicked ? (
          displayOptions.map((v) => (
            <option key={v} value={v}>
              {displayValue(v)}
            </option>
          ))
        ) : (
          <option value={values[0]}>{placeholder}</option>
        )}
      </select>
    </div>
  );
};

/** A boolean switch row: a checkbox for the four team switches. */
const TeamSwitchRow = ({
  label,
  hint,
  enabled,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly hint: string;
  readonly enabled: boolean;
  readonly onChange: (value: boolean) => void;
  readonly disabled?: boolean;
}) => (
  <div className="flex items-center gap-2 py-0.5">
    <input
      type="checkbox"
      checked={enabled}
      onChange={(e) => onChange(e.target.checked)}
      className={TICK_CLASS}
      aria-label={hint}
      disabled={disabled}
    />
    <label className="min-w-28 text-body text-foreground">{label}</label>
    {enabled && (
      <span className="text-caption text-text-muted italic">{hint}</span>
    )}
  </div>
);

/** A player "more often" switch row: a checkbox for Normal/Often, with CM's hint. */
const PlayerSwitchRow = ({
  label,
  hint,
  currentValue,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly hint: string;
  readonly currentValue: "normal" | "often";
  readonly onChange: (value: "normal" | "often") => void;
  readonly disabled?: boolean;
}) => {
  const isOften = currentValue === "often";
  return (
    <div className="flex items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={isOften}
        onChange={() => onChange(isOften ? "normal" : "often")}
        className={TICK_CLASS}
        aria-label={`Tick to set ${label.toLowerCase()}`}
        disabled={disabled}
      />
      <label className="min-w-28 text-body text-foreground">{label}</label>
      {isOften && (
        <span className="text-caption text-text-muted italic">{hint}</span>
      )}
    </div>
  );
};

/** A player override row: tick box "override team", unticked shows "Team (value)". */
const PlayerOverrideRow = ({
  label,
  values,
  currentValue,
  teamValue,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly values: ReadonlyArray<string>;
  readonly currentValue: string;
  readonly teamValue: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) => {
  const isTicked = currentValue !== "team";
  const displayOptions = values.filter((v) => v !== "team");

  return (
    <div className="flex items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={isTicked}
        onChange={() => onChange(isTicked ? "team" : displayOptions[0]!)}
        className={TICK_CLASS}
        aria-label="Tick to override team instructions"
        disabled={disabled}
      />
      <label className="min-w-28 text-body text-foreground">{label}</label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border border-border bg-surface px-2 py-0.5 text-body ${
          isTicked ? "text-foreground" : "text-text-muted italic"
        } ${FOCUS_RING.join(" ")}`}
        disabled={!isTicked || disabled}
        aria-label={label}
      >
        {isTicked ? (
          displayOptions.map((v) => (
            <option key={v} value={v}>
              {OVERRIDE_DISPLAY[v] ?? displayValue(v)}
            </option>
          ))
        ) : (
          <option value="team">
            Team ({OVERRIDE_DISPLAY[teamValue] ?? displayValue(teamValue)})
          </option>
        )}
      </select>
    </div>
  );
};

/** A player standalone row: tick box, unticked shows "(default)". */
const PlayerStandaloneRow = ({
  label,
  values,
  currentValue,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly values: ReadonlyArray<string>;
  readonly currentValue: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) => {
  const isTicked = currentValue !== "default";
  const displayOptions = values.filter((v) => v !== "default");

  return (
    <div className="flex items-center gap-2 py-0.5">
      <input
        type="checkbox"
        checked={isTicked}
        onChange={() => onChange(isTicked ? "default" : displayOptions[0]!)}
        className={TICK_CLASS}
        aria-label="Tick to override normal setting"
        disabled={disabled}
      />
      <label className="min-w-28 text-body text-foreground">{label}</label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border border-border bg-surface px-2 py-0.5 text-body ${
          isTicked ? "text-foreground" : "text-text-muted italic"
        } ${FOCUS_RING.join(" ")}`}
        disabled={!isTicked || disabled}
        aria-label={label}
      >
        {isTicked ? (
          displayOptions.map((v) => (
            <option key={v} value={v}>
              {STANDALONE_DISPLAY[v] ?? displayValue(v)}
            </option>
          ))
        ) : (
          <option value="default">(default)</option>
        )}
      </select>
    </div>
  );
};

/** A set-piece role row: dropdown with "(default)" unticked. */
const SetPieceRoleRow = ({
  label,
  values,
  currentValue,
  onChange,
  disabled,
}: {
  readonly label: string;
  readonly values: ReadonlyArray<string>;
  readonly currentValue: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}) => {
  const isTicked = currentValue !== "default";
  const displayOptions = values.filter((v) => v !== "default");

  return (
    <div className="flex items-center gap-2 py-0.5">
      <label className="min-w-32 text-body text-foreground">{label}</label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded border border-border bg-surface px-2 py-0.5 text-body ${
          isTicked ? "text-foreground" : "text-text-muted italic"
        } ${FOCUS_RING.join(" ")}`}
        disabled={disabled}
        aria-label={label}
      >
        <option value="default">(default)</option>
        {displayOptions.map((v) => (
          <option key={v} value={v}>
            {setPieceRoleDisplay(v)}
          </option>
        ))}
      </select>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Team sub-panel
// ---------------------------------------------------------------------------

const TeamInstructionsPanel = ({
  team,
  teamSetPieces,
  onTeamChange,
  onTeamSetPieceChange,
  disabled,
}: {
  readonly team: TeamInstructions;
  readonly teamSetPieces: Record<string, string>;
  readonly onTeamChange: (patch: Partial<TeamInstructions>) => void;
  readonly onTeamSetPieceChange: (patch: Record<string, string>) => void;
  readonly disabled?: boolean;
}) => (
  <div className="space-y-1">
    <h3 className="mb-2 text-heading text-text-secondary">Team Instructions</h3>

    {/* Choice-valued team instructions */}
    {(Object.keys(TEAM_INSTRUCTION_VALUES) as Array<keyof typeof TEAM_INSTRUCTION_VALUES>).map((key) => (
      <InstructionChoiceRow
        key={key}
        label={displayName(key)}
        placeholder={TEAM_PLACEHOLDER[key]}
        hint={TEAM_TICK_HINT[key]}
        values={TEAM_INSTRUCTION_VALUES[key]}
        currentValue={team[key]}
        onChange={(value) => onTeamChange({ [key]: value } as Partial<TeamInstructions>)}
        disabled={disabled}
      />
    ))}

    {/* Team switches */}
    {TEAM_SWITCHES.map((sw) => (
      <TeamSwitchRow
        key={sw}
        label={TEAM_SWITCH_LABELS[sw]}
        hint={TEAM_SWITCH_HINTS[sw]}
        enabled={team[sw]}
        onChange={(value) => onTeamChange({ [sw]: value } as Partial<TeamInstructions>)}
        disabled={disabled}
      />
    ))}

    {/* Team set-piece instructions */}
    <h3 className="mb-2 mt-4 text-heading text-text-secondary">Set Pieces</h3>
    {(Object.keys(TEAM_SET_PIECE_VALUES) as Array<keyof typeof TEAM_SET_PIECE_VALUES>).map((key) => (
      <InstructionChoiceRow
        key={key}
        label={displayName(key)}
        placeholder="(default)"
        hint={`Tick to set ${displayName(key).toLowerCase()}`}
        values={TEAM_SET_PIECE_VALUES[key]}
        currentValue={teamSetPieces[key] ?? "default"}
        onChange={(value) => onTeamSetPieceChange({ [key]: value })}
        disabled={disabled}
      />
    ))}
  </div>
);

// ---------------------------------------------------------------------------
// Player sub-panel
// ---------------------------------------------------------------------------

const PlayerInstructionsPanel = ({
  slotIndex: _slotIndex,
  slotCell,
  playerInstructions,
  setPieceRoles,
  playerName,
  teamValues,
  onInstructionsChange,
  onSetPieceRoleChange,
  onApplyTemplate,
  disabled,
  isGoalkeeper,
}: {
  readonly slotIndex: number;
  readonly slotCell: Slot;
  readonly playerInstructions: PlayerInstructions;
  readonly setPieceRoles: Record<string, string>;
  readonly playerName: string;
  readonly teamValues: TeamInstructions;
  readonly onInstructionsChange: (patch: Partial<PlayerInstructions>) => void;
  readonly onSetPieceRoleChange: (patch: Record<string, string>) => void;
  readonly onApplyTemplate: (template: string) => void;
  readonly disabled?: boolean;
  readonly isGoalkeeper: boolean;
}) => (
  <div className="space-y-1">
    <h3 className="mb-2 text-heading text-text-highlight">
      Instructions for {playerName}
      <span className="ml-2 text-body text-text-muted">({slotLabel(slotCell)})</span>
    </h3>

    {/* Override rows */}
    <h4 className="text-label font-semibold text-text-secondary">Overrides</h4>
    {(Object.keys(PLAYER_OVERRIDE_VALUES) as Array<keyof typeof PLAYER_OVERRIDE_VALUES>).map((key) => {
      // Team counterpart for marking is the zonalMarking boolean
      const teamDisplayValue = key === "marking"
        ? teamValues.zonalMarking ? "Zonal" : "Man"
        : teamValues[key as keyof typeof TEAM_INSTRUCTION_VALUES] as string ?? "normal";
      return (
        <PlayerOverrideRow
          key={key}
          label={displayName(key)}
          values={PLAYER_OVERRIDE_VALUES[key]}
          currentValue={playerInstructions[key]}
          teamValue={teamDisplayValue}
          onChange={(value) => onInstructionsChange({ [key]: value } as Partial<PlayerInstructions>)}
          disabled={disabled}
        />
      );
    })}

    {/* Standalone settings */}
    <h4 className="mt-3 text-label font-semibold text-text-secondary">Settings</h4>
    {(Object.keys(PLAYER_STANDALONE_VALUES) as Array<keyof typeof PLAYER_STANDALONE_VALUES>).map((key) => {
      // Distribution only for the goalkeeper slot
      if (key === "distribution" && !isGoalkeeper) return null;
      return (
        <PlayerStandaloneRow
          key={key}
          label={displayName(key)}
          values={PLAYER_STANDALONE_VALUES[key]}
          currentValue={playerInstructions[key]}
          onChange={(value) => onInstructionsChange({ [key]: value } as Partial<PlayerInstructions>)}
          disabled={disabled}
        />
      );
    })}

    {/* "More often" switches */}
    <h4 className="mt-3 text-label font-semibold text-text-secondary">More Often</h4>
    {PLAYER_SWITCHES.map((sw) => (
      <PlayerSwitchRow
        key={sw}
        label={displayName(sw)}
        hint={SWITCH_HINTS[sw]}
        currentValue={playerInstructions[sw]}
        onChange={(value) => onInstructionsChange({ [sw]: value } as Partial<PlayerInstructions>)}
        disabled={disabled}
      />
    ))}

    {/* Set To Preset */}
    <div className="mt-4 flex items-center gap-2">
      <span className="text-body text-text-secondary">Set To Preset:</span>
      <div className="flex flex-wrap gap-1">
        {INSTRUCTION_TEMPLATES.map((template) => (
          <button
            key={template}
            type="button"
            onClick={() => onApplyTemplate(template)}
            disabled={disabled}
            className={`rounded border border-border bg-surface px-2 py-0.5 text-caption transition-colors hover:bg-white/10 ${FOCUS_RING.join(" ")} ${
              disabled ? "opacity-40 cursor-not-allowed" : ""
            }`}
            aria-label={`Apply ${TEMPLATE_LABEL[template]} template`}
          >
            {TEMPLATE_LABEL[template]}
          </button>
        ))}
      </div>
    </div>

    {/* Set Piece Instructions */}
    <div className="mt-4">
      <h4 className="mb-2 text-label font-semibold text-text-secondary">
        Set Piece Instructions for {playerName}
      </h4>
      {SET_PIECE_ORDER.map((key) => {
        const options = SET_PIECE_ROLE_VALUES[key as keyof typeof SET_PIECE_ROLE_VALUES];
        if (!options) return null;
        return (
          <SetPieceRoleRow
            key={key}
            label={SET_PIECE_HINTS[key] ?? displayName(key)}
            values={options}
            currentValue={setPieceRoles[key] ?? "default"}
            onChange={(value) => onSetPieceRoleChange({ [key]: value })}
            disabled={disabled}
          />
        );
      })}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

type SubMode = "team" | "player";

const SUB_MODE_CLASS = `${ACTIONS_ROW_BUTTON_CLASS} text-body`;
const SUB_MODE_ACTIVE_CLASS = `${SUB_MODE_CLASS} bg-surface-raised text-text-primary`;

export const SetInstructionsPanel = ({
  tactic,
  squadById,
  selectedSlot,
  onTacticChange,
  disabled,
}: {
  readonly tactic: Tactic;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly selectedSlot: number | null;
  readonly onTacticChange: (tactic: Tactic) => void;
  readonly disabled?: boolean;
}) => {
  const [subMode, setSubMode] = useState<SubMode>("player");
  const [internalSlot, setInternalSlot] = useState<number>(0);

  // For player mode, use the parent's selectedSlot when available; otherwise fall back to internal state
  const effectiveSlot = selectedSlot ?? internalSlot;

  // Build the slot selector options
  const slotOptions = useMemo(
    () =>
      tactic.slots.slice(0, STARTER_COUNT).map((slot, index) => {
        const pid = tactic.assignments[index] ?? "";
        const player = pid ? squadById.get(pid) : undefined;
        const label = player
          ? `${player.lastName}, ${player.firstName.slice(0, 1)} (${slotLabel(slot.cell)})`
          : `Slot ${index + 1} (${slotLabel(slot.cell)})`;
        return { index, label, cell: slot.cell };
      }),
    [tactic, squadById],
  );

  // Handle team instruction changes
  const handleTeamChange = useCallback(
    (patch: Partial<TeamInstructions>) => {
      onTacticChange(
        new Tactic({
          ...tactic,
          team: { ...tactic.team, ...patch },
        }),
      );
    },
    [tactic, onTacticChange],
  );

  // Handle team set-piece changes
  const handleTeamSetPieceChange = useCallback(
    (patch: Record<string, string>) => {
      onTacticChange(
        new Tactic({
          ...tactic,
          teamSetPieces: { ...tactic.teamSetPieces, ...patch },
        }),
      );
    },
    [tactic, onTacticChange],
  );

  // Handle player instructions changes
  const handlePlayerInstructionsChange = useCallback(
    (slotIndex: number, patch: Partial<PlayerInstructions>) => {
      const newSlots = tactic.slots.map((slot, index) =>
        index === slotIndex
          ? { ...slot, instructions: { ...slot.instructions, ...patch } }
          : slot,
      );
      onTacticChange(new Tactic({ ...tactic, slots: newSlots }));
    },
    [tactic, onTacticChange],
  );

  // Handle set-piece role changes
  const handleSetPieceRoleChange = useCallback(
    (slotIndex: number, patch: Record<string, string>) => {
      const newSlots = tactic.slots.map((slot, index) =>
        index === slotIndex
          ? { ...slot, setPieceRoles: { ...slot.setPieceRoles, ...patch } }
          : slot,
      );
      onTacticChange(new Tactic({ ...tactic, slots: newSlots }));
    },
    [tactic, onTacticChange],
  );

  // Handle applying a template
  const handleApplyTemplate = useCallback(
    (slotIndex: number, template: string) => {
      const cell = tactic.slots[slotIndex]!.cell;
      const templ = template as keyof typeof INSTRUCTION_TEMPLATE_VALUES;
      const newInstructions = applyInstructionTemplate(cell, templ);
      const newSlots = tactic.slots.map((slot, index) =>
        index === slotIndex ? { ...slot, instructions: newInstructions } : slot,
      );
      onTacticChange(new Tactic({ ...tactic, slots: newSlots }));
    },
    [tactic, onTacticChange],
  );

  // Current player slot data
  const currentSlot = tactic.slots[effectiveSlot];
  const currentPlayerId = tactic.assignments[effectiveSlot] ?? "";
  const slotPlayer = currentPlayerId ? squadById.get(currentPlayerId) : undefined;
  const playerName = slotPlayer
    ? `${slotPlayer.lastName}, ${slotPlayer.firstName.slice(0, 1)}`
    : `Slot ${effectiveSlot + 1}`;
  const isGoalkeeper = currentSlot?.cell.row === "GK";

  return (
    <div className="h-full overflow-y-auto rounded-panel border border-border bg-card/80 p-4">
      {/* Sub-mode toggle */}
      <nav aria-label="Instructions sub-mode" className="mb-3 flex items-center gap-2 border-b border-border-subtle pb-2">
        <button
          type="button"
          aria-pressed={subMode === "team"}
          onClick={() => setSubMode("team")}
          className={subMode === "team" ? SUB_MODE_ACTIVE_CLASS : SUB_MODE_CLASS}
        >
          Team
        </button>
        <button
          type="button"
          aria-pressed={subMode === "player"}
          onClick={() => setSubMode("player")}
          className={subMode === "player" ? SUB_MODE_ACTIVE_CLASS : SUB_MODE_CLASS}
        >
          Player
        </button>
      </nav>

      {subMode === "team" && (
        <TeamInstructionsPanel
          team={tactic.team}
          teamSetPieces={tactic.teamSetPieces}
          onTeamChange={handleTeamChange}
          onTeamSetPieceChange={handleTeamSetPieceChange}
          disabled={disabled}
        />
      )}

      {subMode === "player" && (
        <>
          {/* Slot selector */}
          <div className="mb-3 flex items-center gap-2">
            <label htmlFor="slot-selector" className="text-body text-text-secondary">
              Player:
            </label>
            <select
              id="slot-selector"
              value={effectiveSlot}
              onChange={(e) => setInternalSlot(Number(e.target.value))}
              className={`rounded border border-border bg-surface px-2 py-1 text-body ${FOCUS_RING.join(" ")}`}
              aria-label="Select player slot"
            >
              {slotOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {currentSlot && (
            <PlayerInstructionsPanel
              slotIndex={effectiveSlot}
              slotCell={currentSlot.cell}
              playerInstructions={currentSlot.instructions}
              setPieceRoles={currentSlot.setPieceRoles}
              playerName={playerName}
              teamValues={tactic.team}
              onInstructionsChange={(patch) => handlePlayerInstructionsChange(effectiveSlot, patch)}
              onSetPieceRoleChange={(patch) => handleSetPieceRoleChange(effectiveSlot, patch)}
              onApplyTemplate={(template) => handleApplyTemplate(effectiveSlot, template)}
              disabled={disabled}
              isGoalkeeper={isGoalkeeper}
            />
          )}
        </>
      )}
    </div>
  );
};