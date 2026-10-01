/**
 * The CM 03/04-style Set Instructions panel: the right-side pane when the Tactics screen is in
 * Set Instructions mode. Two sub-modes: Team (the nine Team Instructions and team set-piece
 * instructions) and Player (per-slot overrides, standalone settings, switches, Set To Preset and
 * set-piece roles). Every control is a tick box enabling a dropdown, exactly as CM renders them.
 *
 * The player shown is the screen's selected slot, so picking a starter in Team Selection and
 * stepping through players here are the same selection.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  type InstructionTemplate,
  type PlayerInstructions,
  type PlayerSwitch,
  type SetPieceRoles,
  type TeamInstructions,
  type TeamSetPieces,
  type TeamSwitch,
} from "@cm-clone/shared";
import { FOCUS_RING } from "../focus.js";
import { CM_BUTTON_CLASS, CM_SELECT_CLASS } from "./cmChrome.js";
import {
  displayName,
  displayValue,
  Panel,
  RowGroup,
  SetPieceRoleRow,
  TickChoiceRow,
  TickFlagRow,
} from "./instructionRows.js";

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

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

/** The team set-piece instructions, in the order and wording the Set Priorities lists use. */
const TEAM_SET_PIECE_LABELS: Record<keyof TeamSetPieces, string> = {
  cornersLeft: "Corners (Left)",
  cornersRight: "Corners (Right)",
  freeKicksLeft: "Free Kicks (Left)",
  freeKicksRight: "Free Kicks (Right)",
  throwInsLeft: "Throw Ins (Left)",
  throwInsRight: "Throw Ins (Right)",
};

/** The six set-piece roles in the order CM shows them, with CM's labels. */
const SET_PIECE_ROLE_LABELS: Record<keyof SetPieceRoles, string> = {
  defendFreeKick: "Defend Free Kicks",
  attackFreeKick: "Attack Free Kicks",
  defendCorner: "Defend Corners",
  attackCorner: "Attack Corners",
  attackingThrowInLeft: "Attacking Throw-ins (Left)",
  attackingThrowInRight: "Attacking Throw-ins (Right)",
};

const keysOf = <T extends object>(record: T) => Object.keys(record) as Array<keyof T & string>;

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Team rows
// ---------------------------------------------------------------------------

const TeamInstructionRows = ({
  team,
  onTeamChange,
  disabled,
}: {
  readonly team: TeamInstructions;
  readonly onTeamChange: (patch: Partial<TeamInstructions>) => void;
  readonly disabled?: boolean | undefined;
}) => (
  <>
    <RowGroup name="Instructions">
      {keysOf(TEAM_INSTRUCTION_VALUES).map((key) => (
        <TickChoiceRow
          key={key}
          label={displayName(key)}
          tickHint={TEAM_TICK_HINT[key]}
          values={TEAM_INSTRUCTION_VALUES[key]}
          offValue={TEAM_INSTRUCTION_VALUES[key][0]}
          placeholder={TEAM_PLACEHOLDER[key]}
          currentValue={team[key]}
          onChange={(value) => onTeamChange({ [key]: value } as Partial<TeamInstructions>)}
          disabled={disabled}
        />
      ))}
    </RowGroup>
    <RowGroup name="Team Switches">
      {TEAM_SWITCHES.map((sw) => (
        <TickFlagRow
          key={sw}
          label={TEAM_SWITCH_LABELS[sw]}
          tickHint={TEAM_SWITCH_HINTS[sw]}
          hint={TEAM_SWITCH_HINTS[sw]}
          enabled={team[sw]}
          onChange={(value) => onTeamChange({ [sw]: value } as Partial<TeamInstructions>)}
          disabled={disabled}
        />
      ))}
    </RowGroup>
  </>
);

const TeamSetPieceRows = ({
  teamSetPieces,
  onTeamSetPieceChange,
  disabled,
}: {
  readonly teamSetPieces: TeamSetPieces;
  readonly onTeamSetPieceChange: (patch: Partial<TeamSetPieces>) => void;
  readonly disabled?: boolean | undefined;
}) => (
  <RowGroup name="Set Pieces">
    {keysOf(TEAM_SET_PIECE_VALUES).map((key) => (
      <TickChoiceRow
        key={key}
        label={TEAM_SET_PIECE_LABELS[key]}
        tickHint={`Tick to set ${TEAM_SET_PIECE_LABELS[key].toLowerCase()}`}
        values={TEAM_SET_PIECE_VALUES[key]}
        offValue="default"
        placeholder="(default)"
        currentValue={teamSetPieces[key]}
        onChange={(value) => onTeamSetPieceChange({ [key]: value } as Partial<TeamSetPieces>)}
        disabled={disabled}
      />
    ))}
  </RowGroup>
);

// ---------------------------------------------------------------------------
// Player rows
// ---------------------------------------------------------------------------

const PlayerInstructionRows = ({
  instructions,
  teamValues,
  isGoalkeeper,
  onInstructionsChange,
  disabled,
}: {
  readonly instructions: PlayerInstructions;
  readonly teamValues: TeamInstructions;
  readonly isGoalkeeper: boolean;
  readonly onInstructionsChange: (patch: Partial<PlayerInstructions>) => void;
  readonly disabled?: boolean | undefined;
}) => (
  <>
    <RowGroup name="Overrides">
      {keysOf(PLAYER_OVERRIDE_VALUES).map((key) => {
        // The team counterpart for marking is the zonalMarking switch
        const teamValue = key === "marking" ? (teamValues.zonalMarking ? "zonal" : "man") : teamValues[key];
        return (
          <TickChoiceRow
            key={key}
            label={displayName(key)}
            tickHint="Tick to override team instructions"
            values={PLAYER_OVERRIDE_VALUES[key]}
            offValue="team"
            placeholder={`Team (${displayValue(teamValue)})`}
            currentValue={instructions[key]}
            onChange={(value) => onInstructionsChange({ [key]: value } as Partial<PlayerInstructions>)}
            disabled={disabled}
          />
        );
      })}
    </RowGroup>
    <RowGroup name="Settings">
      {keysOf(PLAYER_STANDALONE_VALUES)
        .filter((key) => key !== "distribution" || isGoalkeeper)
        .map((key) => (
          <TickChoiceRow
            key={key}
            label={displayName(key)}
            tickHint="Tick to override normal setting"
            values={PLAYER_STANDALONE_VALUES[key]}
            offValue="default"
            placeholder="(default)"
            currentValue={instructions[key]}
            onChange={(value) => onInstructionsChange({ [key]: value } as Partial<PlayerInstructions>)}
            disabled={disabled}
          />
        ))}
    </RowGroup>
    <RowGroup name="More Often">
      {PLAYER_SWITCHES.map((sw) => (
        <TickFlagRow
          key={sw}
          label={displayName(sw)}
          tickHint={`Tick to set ${displayName(sw).toLowerCase()}`}
          hint={SWITCH_HINTS[sw]}
          enabled={instructions[sw] === "often"}
          onChange={(often) => onInstructionsChange({ [sw]: often ? "often" : "normal" })}
          disabled={disabled}
        />
      ))}
    </RowGroup>
  </>
);

const SetPieceRoleRows = ({
  setPieceRoles,
  onSetPieceRoleChange,
  disabled,
}: {
  readonly setPieceRoles: SetPieceRoles;
  readonly onSetPieceRoleChange: (patch: Partial<SetPieceRoles>) => void;
  readonly disabled?: boolean | undefined;
}) => (
  <RowGroup name="Set Piece Roles">
    {keysOf(SET_PIECE_ROLE_LABELS).map((key) => (
      <SetPieceRoleRow
        key={key}
        label={SET_PIECE_ROLE_LABELS[key]}
        values={SET_PIECE_ROLE_VALUES[key]}
        currentValue={setPieceRoles[key]}
        onChange={(value) => onSetPieceRoleChange({ [key]: value } as Partial<SetPieceRoles>)}
        disabled={disabled}
      />
    ))}
  </RowGroup>
);

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

type SubMode = "team" | "player";

const STEP_BUTTON_CLASS = `${CM_BUTTON_CLASS} px-1`;

/** CM's template names, as the Set To Preset list labels them. */
const TEMPLATE_LABEL: Record<InstructionTemplate, string> = {
  goalkeeper: "Goalkeeper",
  centralDefender: "Central Defender",
  fullBack: "Full Back",
  defensiveMidfielder: "Defensive Midfielder",
  attackingMidfielder: "Attacking Midfielder",
  winger: "Winger",
  striker: "Striker",
};

const playerLabel = (player: SquadPlayerView | undefined, index: number): string =>
  player ? `${player.lastName}, ${player.firstName.slice(0, 1)}` : `Slot ${index + 1}`;

export const SetInstructionsPanel = ({
  tactic,
  squadById,
  selectedSlot,
  onSelectSlot,
  onTacticChange,
  disabled,
}: {
  readonly tactic: Tactic;
  readonly squadById: ReadonlyMap<string, SquadPlayerView>;
  readonly selectedSlot: number | null;
  readonly onSelectSlot: (slotIndex: number) => void;
  readonly onTacticChange: (tactic: Tactic) => void;
  readonly disabled?: boolean;
}) => {
  const [subMode, setSubMode] = useState<SubMode>("player");

  const starterCount = Math.min(STARTER_COUNT, tactic.slots.length);
  const slotIndex = selectedSlot !== null && selectedSlot < starterCount ? selectedSlot : 0;
  const currentSlot = tactic.slots[slotIndex];
  const currentName = currentSlot
    ? `${playerLabel(squadById.get(tactic.assignments[slotIndex] ?? ""), slotIndex)} (${slotLabel(currentSlot.cell)})`
    : "";

  const updateSlot = (patch: (slot: Tactic["slots"][number]) => Tactic["slots"][number]) =>
    onTacticChange(
      new Tactic({
        ...tactic,
        slots: tactic.slots.map((slot, index) => (index === slotIndex ? patch(slot) : slot)),
      }),
    );

  const applyTemplate = (template: InstructionTemplate) =>
    updateSlot((slot) => ({ ...slot, instructions: applyInstructionTemplate(slot.cell, template) }));

  const subModeToggle = (
    <nav aria-label="Instructions sub-mode" className="flex items-center gap-1">
      <button
        type="button"
        aria-pressed={subMode === "team"}
        onClick={() => setSubMode("team")}
        className={CM_BUTTON_CLASS}
      >
        Team
      </button>
      <button
        type="button"
        aria-pressed={subMode === "player"}
        onClick={() => setSubMode("player")}
        className={CM_BUTTON_CLASS}
      >
        Player
      </button>
    </nav>
  );

  if (subMode === "team") {
    return (
      <div className="flex h-full min-h-0 flex-col gap-3">
        <Panel label="Team Instructions" title="Team Instructions" controls={subModeToggle} className="flex-[3]">
          <TeamInstructionRows
            team={tactic.team}
            onTeamChange={(patch) => onTacticChange(new Tactic({ ...tactic, team: { ...tactic.team, ...patch } }))}
            disabled={disabled}
          />
        </Panel>
        <Panel
          label="Set Piece Instructions"
          title="Set Piece Instructions"
          controls={<span className="text-caption text-text-secondary">Takers are named under Set Priorities.</span>}
          className="flex-[2]"
        >
          <TeamSetPieceRows
            teamSetPieces={tactic.teamSetPieces}
            onTeamSetPieceChange={(patch) =>
              onTacticChange(new Tactic({ ...tactic, teamSetPieces: { ...tactic.teamSetPieces, ...patch } }))
            }
            disabled={disabled}
          />
        </Panel>
      </div>
    );
  }

  if (currentSlot === undefined) return null;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <Panel
        label="Player Instructions"
        title={
          <>
            <span>Instructions for</span>
            <select
              value={slotIndex}
              onChange={(e) => onSelectSlot(Number(e.target.value))}
              className={`ml-1 cursor-pointer rounded-control bg-transparent pr-1 font-bold text-cm-title hover:bg-white/10 [&>option]:bg-popover [&>option]:text-popover-foreground ${FOCUS_RING.join(" ")}`}
              aria-label="Select player slot"
            >
              {tactic.slots.slice(0, starterCount).map((slot, index) => (
                <option key={index} value={index}>
                  {`${playerLabel(squadById.get(tactic.assignments[index] ?? ""), index)} (${slotLabel(slot.cell)})`}
                </option>
              ))}
            </select>
          </>
        }
        controls={
          <>
            <button
              type="button"
              aria-label="Previous player"
              disabled={slotIndex === 0}
              onClick={() => onSelectSlot(slotIndex - 1)}
              className={STEP_BUTTON_CLASS}
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next player"
              disabled={slotIndex >= starterCount - 1}
              onClick={() => onSelectSlot(slotIndex + 1)}
              className={STEP_BUTTON_CLASS}
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="mx-1" />
            {subModeToggle}
          </>
        }
        footer={
          <select
            value=""
            onChange={(e) => {
              if (e.target.value !== "") applyTemplate(e.target.value as InstructionTemplate);
            }}
            disabled={disabled}
            className={`${CM_SELECT_CLASS} w-60`}
            aria-label="Set to preset"
            title="Replace this player's instructions with a preset"
          >
            <option value="">Set To Preset</option>
            {INSTRUCTION_TEMPLATES.map((template) => (
              <option key={template} value={template}>
                {TEMPLATE_LABEL[template]}
              </option>
            ))}
          </select>
        }
        className="flex-[3]"
      >
        <PlayerInstructionRows
          instructions={currentSlot.instructions}
          teamValues={tactic.team}
          isGoalkeeper={currentSlot.cell.row === "GK"}
          onInstructionsChange={(patch) =>
            updateSlot((slot) => ({ ...slot, instructions: { ...slot.instructions, ...patch } }))
          }
          disabled={disabled}
        />
      </Panel>
      <Panel
        label="Set Piece Instructions"
        title={`Set Piece Instructions for ${currentName}`}
        className="flex-[2]"
      >
        <SetPieceRoleRows
          setPieceRoles={currentSlot.setPieceRoles}
          onSetPieceRoleChange={(patch) =>
            updateSlot((slot) => ({ ...slot, setPieceRoles: { ...slot.setPieceRoles, ...patch } }))
          }
          disabled={disabled}
        />
      </Panel>
    </div>
  );
};
