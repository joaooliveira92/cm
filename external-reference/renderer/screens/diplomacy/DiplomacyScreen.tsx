import type { ReactNode } from "react";
import { AlertCircle, Anchor, CheckCircle2, Handshake, Info, Swords, X } from "lucide-react";
import { PageHeader } from "../../components/shared/PageHeader.js";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { CardContent, CardHeader, CardTitle } from "../../components/ui/card.js";
import { GlassCard } from "../../components/ui/glass-card.js";
import { Kbd } from "../../components/ui/kbd.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import type { DiplomacyScreenProjection } from "../../../shared/diplomacy-contract.js";
import { isHighTension, tensionLabel } from "@bluewave/campaign-engine";
import { NATION_DOSSIER_FIELDS } from "../../content/nationDossierFields.js";
import { nationIdToCountryId } from "../new-game/nation-selection/slotBridge.js";
import { useDiplomacyScreen } from "./hooks/useDiplomacyScreen.js";
import {
  RELATION_LABELS,
  diplomacyLegalActions,
  type DiplomacyDraftCommand,
} from "./diplomacy-screen-state.js";

/**
 * Diplomacy & War screen (desktop-diplomacy-war INC-3). Renders ONLY data
 * from the engine's `DiplomacyScreenProjection` — relations, wars, blockades,
 * world areas — with per-row action affordances derived from the projected
 * relation/nap state (spec: UI affordance only; the engine is the authority
 * at issue time). Submitting `submitDiplomacyCommand` uses the shell's
 * `expectedRevision` / `transportRequestId` optimistic-concurrency flow; the
 * engine applies the queued envelope on the NEXT turn advance (spec D1) — the
 * screen says exactly that, and engine rejection notices carry the engine's
 * code verbatim (never fabricated copy).
 */
export function DiplomacyScreen({ sessionId }: { readonly sessionId: string }) {
  const {
    state,
    setRowAction,
    setPeaceAction,
    setBlockadeArea,
    clearDraft,
    submit,
    reload,
    canSubmit,
  } = useDiplomacyScreen(sessionId);

  if (state.kind === "load-failed") {
    return (
      <div data-guided-target="diplomacy" className="space-y-6">
        <PageHeader
          icon={Handshake}
          title="Diplomacy & War"
          description="Relations, wars and blockades from the compiled campaign state."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Diplomacy screen failed to load</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span className="whitespace-pre-wrap">{state.message}</span>
            <Button variant="outline" size="sm" className="w-fit" onClick={() => void reload()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <div data-guided-target="diplomacy" className="space-y-6">
        <PageHeader
          icon={Handshake}
          title="Diplomacy & War"
          description="Relations, wars and blockades from the compiled campaign state."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[0, 1, 2].map((idx) => (
            <Skeleton key={idx} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const busy = state.kind === "submitting";
  const projection = state.projection;
  const playerCountryId = nationIdToCountryId(projection.playerNationId);
  const likelyRivals: readonly string[] =
    playerCountryId !== null ? NATION_DOSSIER_FIELDS[playerCountryId].likelyRivals : [];

  return (
    <div data-guided-target="diplomacy" className="space-y-6">
      <PageHeader
        icon={Handshake}
        title="Diplomacy & War"
        description="View and direct relations; the engine applies commands on the next turn advance."
        actions={
          <div className="flex items-center gap-1.5">
            <Kbd>
              {String(state.month.month).padStart(2, "0")}/{state.month.year}
            </Kbd>
            <Kbd>REV {state.revision}</Kbd>
          </div>
        }
      />

      {state.notice !== null && (
        <Alert variant={state.kind === "submitted" ? "default" : "destructive"}>
          {state.kind === "submitted" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          {state.kind === "submitted" ? (
            <AlertTitle>Command queued</AlertTitle>
          ) : (
            <AlertTitle>Not applied</AlertTitle>
          )}
          <AlertDescription className="whitespace-pre-wrap">{state.notice}</AlertDescription>
        </Alert>
      )}

      <GlassSection
        icon={<Handshake className="h-4 w-4 text-muted-foreground" />}
        title="Relations"
        description="Every nation's relation, tension, NAP and start of the current stance."
      >
        {projection.relations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No relations recorded yet</p>
        ) : (
          <div className="space-y-2.5">
            {projection.relations.map((row) => {
              const actions = diplomacyLegalActions(row);
              const isLikelyRival = likelyRivals.includes(row.partnerName);
              const highTension = isHighTension(row.tension);
              const label = tensionLabel(row.tension);
              return (
                <div key={row.partnerNationId} className="rounded-md border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{row.partnerName}</span>
                      {isLikelyRival && <Badge variant="outline">Likely rival</Badge>}
                      <Badge variant="secondary">{RELATION_LABELS[row.relation]}</Badge>
                      <Badge variant="outline">{label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        tension {row.tension}/10
                      </span>
                      {row.nap && <Badge variant="outline">NAP</Badge>}
                      <span className="text-xs text-muted-foreground">since {row.since}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {actions.map((kind) => (
                        <Button
                          key={kind}
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => setRowAction(row.partnerNationId, kind)}
                        >
                          {ACTION_LABELS[kind]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {highTension && (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                      Relations with {row.partnerName} are {label}; war is possible
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Commands are validated by the engine when submitted — a rejected command shows the
          engine's code, never a fabricated message.
        </p>
      </GlassSection>

      <GlassSection
        icon={<Swords className="h-4 w-4 text-muted-foreground" />}
        title="Wars"
        description="Player-involved wars with war scores, status and dates."
      >
        {projection.wars.length === 0 ? (
          <p className="text-sm text-muted-foreground">No wars yet</p>
        ) : (
          <div className="space-y-2.5">
            {projection.wars.map((war) => (
              <div key={war.warId} className="rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{war.warId}</span>
                    <Badge variant={war.status === "ENDED" ? "secondary" : "destructive"}>
                      {war.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {sideLabel(projection, war.attackerSideMembers)} vs{" "}
                      {sideLabel(projection, war.defenderSideMembers)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      score {war.attackerWarScore}:{war.defenderWarScore}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {war.startDate}
                      {war.endDate !== undefined ? ` — ${war.endDate}` : ""}
                    </span>
                    <Badge variant="outline">
                      you: {war.playerSide === "attacker" ? "attacker" : "defender"}
                    </Badge>
                  </div>
                  {war.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => setPeaceAction(war.warId)}
                    >
                      Accept peace
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassSection>

      <GlassSection
        icon={<Anchor className="h-4 w-4 text-muted-foreground" />}
        title="Blockades"
        description="Blockade coverage involving your nation, per strategic area."
      >
        {projection.blockades.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blockades yet</p>
        ) : (
          <div className="space-y-1.5">
            {projection.blockades.map((blockade) => (
              <div
                key={`${blockade.blockaderId}:${blockade.blockadedNationId}:${blockade.areaId}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <span className="text-sm">
                  {nationName(projection, blockade.blockaderId)} →{" "}
                  {nationName(projection, blockade.blockadedNationId)}
                </span>
                <span className="text-xs text-muted-foreground">
                  in {areaName(projection, blockade.areaId)} · since {blockade.establishedMonth}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassSection>

      <CommandQueueBar
        busy={busy}
        projection={projection}
        draft={state.draftCommand}
        canSubmit={canSubmit}
        onAreaChange={setBlockadeArea}
        onClear={clearDraft}
        onApply={submit}
      />
    </div>
  );
}

function CommandQueueBar({
  busy,
  projection,
  draft,
  canSubmit,
  onAreaChange,
  onClear,
  onApply,
}: {
  readonly busy: boolean;
  readonly projection: DiplomacyScreenProjection;
  readonly draft: DiplomacyDraftCommand | null;
  readonly canSubmit: boolean;
  readonly onAreaChange: (areaId: string) => void;
  readonly onClear: () => void;
  readonly onApply: () => void;
}) {
  return (
    <GlassCard glassVariant="liquid-refract">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          <Handshake className="h-4 w-4 text-muted-foreground" />
          Command queue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft === null ? (
          <p className="text-sm text-muted-foreground">
            No command selected. Pick an action on a relation row or accept peace on an active war.
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{describeDraft(projection, draft)}</span>
              {draft.kind === "DeclareBlockade" && (
                <Select
                  value={draft.areaId}
                  onValueChange={(areaId) => onAreaChange(areaId)}
                  disabled={busy}
                  className="w-52"
                >
                  <SelectTrigger aria-label="Blockade area">
                    <SelectValue placeholder="Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {projection.areas.map((area) => (
                      <SelectItem key={area.areaId} value={area.areaId}>
                        {area.name} ({area.areaId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" disabled={busy} onClick={onClear}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
              <Button size="sm" disabled={!canSubmit || busy} onClick={onApply}>
                {busy ? "Submitting…" : "Submit command"}
              </Button>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Queued commands are applied by the engine on the <strong>next turn advance</strong> — the
          engine remains the only writer of relations, wars and blockades.
        </p>
      </CardContent>
    </GlassCard>
  );
}

function GlassSection({
  icon,
  title,
  description,
  children,
}: {
  readonly icon: ReactNode;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}) {
  return (
    <GlassCard glassVariant="liquid-refract">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {title}
        </CardTitle>
        {description !== undefined && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </GlassCard>
  );
}

const ACTION_LABELS: Readonly<Record<string, string>> = {
  DeclareWar: "Declare war",
  AcceptPeace: "Accept peace",
  FormAlliance: "Form alliance",
  BreakAlliance: "Break alliance",
  FormNonAggressionPact: "Form NAP",
  BreakNonAggressionPact: "Break NAP",
  DeclareBlockade: "Blockade",
};

function describeDraft(
  projection: DiplomacyScreenProjection,
  draft: DiplomacyDraftCommand,
): string {
  const base = `${ACTION_LABELS[draft.kind] ?? draft.kind}`;
  switch (draft.kind) {
    case "AcceptPeace":
      return `${base} in war ${draft.warId ?? "(unknown)"}`;
    case "DeclareBlockade":
      return `${base} on ${nationName(projection, draft.partnerNationId)}`;
    default:
      return `${base} with ${nationName(projection, draft.partnerNationId)}`;
  }
}

function nationName(projection: DiplomacyScreenProjection, nationId: string): string {
  return (
    projection.knownNations.find((n) => n.nationId === nationId)?.name ??
    (nationId === projection.playerNationId ? "your nation" : nationId)
  );
}

function sideLabel(projection: DiplomacyScreenProjection, memberIds: readonly string[]): string {
  return memberIds.map((id) => nationName(projection, id)).join(" + ") || "—";
}

function areaName(projection: DiplomacyScreenProjection, areaId: string): string {
  return projection.areas.find((a) => a.areaId === areaId)?.name ?? areaId;
}
