import { useCallback, useState, type ReactNode } from "react";
import type { SaveId, SquadPlayerView } from "@cm-clone/contracts";
import { Alert } from "../components/ui/alert.js";
import { describeRpcError } from "../rpc.js";
import { InMatchTacticFooter } from "./InMatchTacticFooter.js";
import { TacticConflictBar } from "./TacticConflictBar.js";
import { TacticsBottomBar } from "./TacticsBottomBar.js";
import { TacticsMenuBar } from "./TacticsMenuBar.js";
import { TacticsModeArea } from "./TacticsModeArea.js";
import { TacticsScreenFrame } from "./TacticsScreenFrame.js";
import { TeamSelectionPanel } from "./TeamSelectionPanel.js";
import { isModifiedFromTemplate } from "./tacticEdits.js";
import type { ColumnVisibility, InMatchTactics, Mode } from "./tacticsTypes.js";
import { useTacticDraft, type TacticDraft } from "./useTacticDraft.js";
import { useTacticEditing } from "./useTacticEditing.js";
import { useTacticsActionHandlers } from "./useTacticsActionHandlers.js";
import { useTacticsShortcuts } from "./useTacticsShortcuts.js";

export type { InMatchTactics } from "./tacticsTypes.js";

// ── The screen ──────────────────────────────────────────────────

/**
 * The Tactics screen has two data sources — the persisted draft (a route) and
 * the live match (a command surface) — and `useTacticDraft` may only run on
 * the route. Each source is its own component so the hook is called
 * unconditionally; the workspace below is shared and takes whichever draft the
 * source produced.
 */
export const TacticsScreen = ({ saveId, inMatch }: { readonly saveId: SaveId; readonly inMatch?: InMatchTactics }) =>
  inMatch === undefined ? (
    <StandaloneTacticsScreen saveId={saveId} />
  ) : (
    <InMatchTacticsScreen saveId={saveId} inMatch={inMatch} />
  );

const StandaloneTacticsScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const draft = useTacticDraft(saveId, {
    saveFailureMessage: "Failed to save tactic — check every slot has a unique player assigned.",
  });
  return <TacticsWorkspace saveId={saveId} draft={draft} />;
};

const InMatchTacticsScreen = ({ saveId, inMatch }: { readonly saveId: SaveId; readonly inMatch: InMatchTactics }) => (
  <TacticsWorkspace saveId={saveId} inMatch={inMatch} draft={null} />
);

const TacticsWorkspace = ({
  saveId,
  inMatch,
  draft,
}: {
  readonly saveId: SaveId;
  readonly inMatch?: InMatchTactics;
  readonly draft: TacticDraft | null;
}) => {
  const isInMatch = inMatch !== undefined;

  // ── Data sources ──────────────────────────────────────────────

  const viewResult = isInMatch
    ? ({
        _tag: "Success" as const,
        value: { squad: inMatch!.squad, club: { name: inMatch!.clubName }, tactic: inMatch!.tactic, revision: 0 },
      } as const)
    : draft!.viewResult;
  const viewError = isInMatch ? null : draft!.viewError;
  const tactic = isInMatch ? inMatch!.tactic : draft!.tactic;
  const revision = isInMatch ? 0 : draft!.revision;
  const conflict = isInMatch ? null : draft!.conflict;
  const status = isInMatch ? null : draft!.status;
  const setTactic = isInMatch ? inMatch!.setTactic : draft!.setTactic;
  const save = isInMatch ? (() => Promise.resolve(false)) : draft!.save;
  const refresh = isInMatch ? (() => {}) : draft!.refresh;

  const squad: ReadonlyArray<SquadPlayerView> = isInMatch
    ? inMatch!.squad
    : viewResult._tag === "Success"
      ? viewResult.value.squad
      : [];
  const clubName: string = isInMatch
    ? inMatch!.clubName
    : viewResult._tag === "Success"
      ? viewResult.value.club.name
      : "";

  // ── Local editor state ────────────────────────────────────────

  const [mode, setMode] = useState<Mode>("positions");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [columns, setColumns] = useState<ColumnVisibility>({ pos: true, fit: true, condition: true });

  const toggleColumn = useCallback((column: keyof ColumnVisibility) => {
    setColumns((current) => ({ ...current, [column]: !current[column] }));
  }, []);

  // ── Wiring ────────────────────────────────────────────────────

  useTacticsActionHandlers({ isInMatch, inMatch, saveId, tactic, squad, revision, setTactic, save });
  const editing = useTacticEditing({ tactic, setTactic, setSelectedSlot });
  useTacticsShortcuts({ isInMatch, setSelectedSlot });

  const modified = isModifiedFromTemplate(tactic);

  // Early returns — all hooks above are stable across renders
  if (!isInMatch) {
    if (viewError)
      return (
        <TacticsScreenFrame variant="message">
          <Alert variant="destructive">
            <p>{describeRpcError(viewError)}</p>
          </Alert>
        </TacticsScreenFrame>
      );
    if (viewResult._tag === "Initial")
      return (
        <TacticsScreenFrame variant="message">
          <p className="p-8 text-text-secondary">Loading tactics...</p>
        </TacticsScreenFrame>
      );
    if (viewResult._tag === "Failure")
      return (
        <TacticsScreenFrame variant="message">
          <Alert variant="destructive">
            <p>Failed to load tactics</p>
          </Alert>
        </TacticsScreenFrame>
      );
  }

  // ── Success only from here (or inMatch always ready) ──────────

  const squadById = new Map(squad.map((player) => [player.id, player]));

  const content: ReactNode = (
    <>
      <h1 className="sr-only">{clubName} Tactics</h1>

      <TacticsMenuBar
        isInMatch={isInMatch}
        sourceTemplate={tactic.sourceTemplate}
        modified={modified}
        columns={columns}
        onToggleColumn={toggleColumn}
        mode={mode}
        onSelectMode={setMode}
      />

      {/* Main content: left column (Team Selection) + right area (pitch) */}
      {/* A size container, so the pitch panel can take the width a 68:100 pitch of this height needs.
          In a match the match state sits above it, so it keeps a floor rather than shrink to nothing
          on a short window. */}
      <div className={`flex min-h-0 flex-1 gap-3 [container-type:size] ${isInMatch ? "min-h-[24rem]" : ""}`}>
        <TeamSelectionPanel
          tactic={tactic}
          squad={squad}
          mode={mode}
          selectedSlot={selectedSlot}
          columns={columns}
          onSelectSlot={editing.handleSelectSlot}
          onSwap={editing.handleBringIn}
          onAssign={editing.handleAssign}
        />

        {/* Right area: mode-dependent content */}
        {/* Set Positions: the pitch's width at full height (68% of it, plus the panel's padding and
            border), capped so Team Selection keeps 40% of the row. The other modes take the rest. */}
        <TacticsModeArea
          mode={mode}
          tactic={tactic}
          squad={squad}
          squadById={squadById}
          selectedSlot={selectedSlot}
          columns={columns}
          onSelectSlot={editing.handleSelectSlot}
          onSwap={editing.handleSwap}
          onMove={editing.handleMove}
          onToggleRun={editing.handleToggleRun}
          onTacticChange={setTactic}
        />
      </div>

      {!isInMatch && (
        <TacticsBottomBar tactic={tactic} squad={squad} enabled={viewResult._tag === "Success"} />
      )}

      {isInMatch && (
        <InMatchTacticFooter
          validationError={inMatch!.validationError}
          pendingCount={inMatch!.pendingCount}
          isPending={inMatch!.isPending}
        />
      )}

      <TacticConflictBar conflict={conflict} status={status} onRefresh={refresh} />
    </>
  );

  // In in-match mode, LiveCommandFrame provides the <main> tag
  if (isInMatch) return content;

  return <TacticsScreenFrame variant="workspace">{content}</TacticsScreenFrame>;
};
