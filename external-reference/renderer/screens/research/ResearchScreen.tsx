import type { ReactNode } from "react";
import {
  AlertCircle,
  Beaker,
  CheckCircle2,
  FlaskConical,
  Info,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import { CANONICAL_RESEARCH_FIELD_IDS, MAX_HIGH_PRIORITY_FIELDS } from "@bluewave/campaign-engine";
import { PageHeader } from "../../components/shared/PageHeader.js";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert.js";
import { Badge } from "../../components/ui/badge.js";
import { Button } from "../../components/ui/button.js";
import { CardContent, CardHeader, CardTitle } from "../../components/ui/card.js";
import { GlassCard } from "../../components/ui/glass-card.js";
import { Kbd } from "../../components/ui/kbd.js";
import { Skeleton } from "../../components/ui/skeleton.js";
import { Toggle } from "../../components/ui/toggle.js";
import { useResearchScreen } from "./hooks/useResearchScreen.js";
import {
  WEIGHT_OPTIONS,
  deriveProjectedResearchAllocations,
  draftHighCount,
  isDraftDirty,
} from "./research-screen-state.js";

/**
 * Research & Technology screen (desktop-engine-feature-gate INC-3). Renders
 * ONLY data from the engine's `ResearchScreenProjection` — research budget,
 * field priorities (editable), in-progress technology work with invested
 * points, and discovered technologies. Submitting `setResearchPriorityCommand`
 * uses the shell's `expectedRevision` / `transportRequestId`
 * optimistic-concurrency flow (same as the Construction screen); the engine
 * applies the queued priorities on the NEXT turn advance (spec D1) — the
 * screen says exactly that, never that they are already in effect.
 */
export function ResearchScreen({ sessionId }: { readonly sessionId: string }) {
  const { state, setFieldWeight, submit, reload, canSubmit } = useResearchScreen(sessionId);

  if (state.kind === "load-failed") {
    return (
      <div data-guided-target="research" className="space-y-6">
        <PageHeader
          icon={FlaskConical}
          title="Research & Technology"
          description="Direct the monthly research budget across fields."
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Research screen failed to load</AlertTitle>
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
      <div data-guided-target="research" className="space-y-6">
        <PageHeader
          icon={FlaskConical}
          title="Research & Technology"
          description="The monthly research budget across fields."
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
  const highCount = draftHighCount(state.draft);
  const highCountValid = highCount >= 1 && highCount <= MAX_HIGH_PRIORITY_FIELDS;
  const dirty = isDraftDirty(state.projection, state.draft);
  const projected = deriveProjectedResearchAllocations(
    state.projection.researchBudget,
    state.draft,
  );

  return (
    <div data-guided-target="research" className="space-y-6">
      <PageHeader
        icon={FlaskConical}
        title="Research & Technology"
        description="Set field priorities; the engine applies them on the next turn advance."
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
            <AlertTitle>Priorities queued</AlertTitle>
          ) : (
            <AlertTitle>Not applied</AlertTitle>
          )}
          <AlertDescription className="whitespace-pre-wrap">{state.notice}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GlassSection
          icon={<Beaker className="h-4 w-4 text-muted-foreground" />}
          title="Research budget"
        >
          <p className="text-2xl font-semibold tracking-tight">
            {state.projection.researchBudget.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">points available to allocate this month</p>
        </GlassSection>

        <GlassSection
          icon={<Lightbulb className="h-4 w-4 text-muted-foreground" />}
          title="Current project"
        >
          {state.projection.currentProjectTechId === null ? (
            <p className="text-sm text-muted-foreground">No active project selected</p>
          ) : (
            <p className="font-mono text-sm">{state.projection.currentProjectTechId}</p>
          )}
        </GlassSection>

        <GlassSection
          icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
          title="Discovered technologies"
        >
          {state.projection.discoveredTechIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">None discovered yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {state.projection.discoveredTechIds.map((techId) => (
                <Badge key={techId} variant="outline" className="font-mono">
                  {techId}
                </Badge>
              ))}
            </div>
          )}
        </GlassSection>
      </div>

      <GlassSection
        icon={<FlaskConical className="h-4 w-4 text-muted-foreground" />}
        title="Field priorities"
        description="High (4) / Medium (2) / Low (1) weight scale; exactly 1..5 fields may stay High."
      >
        {dirty && (
          <p className="text-xs font-medium text-amber-600" role="status" aria-live="polite">
            Unsaved changes — draft differs from the last committed priorities
          </p>
        )}
        <div className="space-y-2.5">
          {CANONICAL_RESEARCH_FIELD_IDS.map((fieldId) => {
            const weight = state.draft[fieldId] ?? 1;
            const projectedPoints = projected[fieldId] ?? 0;
            const isHigh = weight === 4;
            return (
              <div
                key={fieldId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs">{fieldId}</span>
                  <span className="text-xs text-muted-foreground">
                    ~{projectedPoints.toLocaleString()} pts next month
                  </span>
                </div>
                <div className="flex items-center gap-1" role="group" aria-label={fieldId}>
                  {WEIGHT_OPTIONS.map((option) => {
                    const wouldExceedHighCap =
                      option.weight === 4 && !isHigh && highCount >= MAX_HIGH_PRIORITY_FIELDS;
                    return (
                      <Toggle
                        key={option.label}
                        pressed={weight === option.weight}
                        onPressedChange={() => setFieldWeight(fieldId, option.weight)}
                        disabled={busy || wouldExceedHighCap}
                        size="sm"
                        aria-label={`${fieldId} ${option.label}`}
                        title={
                          wouldExceedHighCap
                            ? `At most ${MAX_HIGH_PRIORITY_FIELDS} fields may be High — lower another High field first`
                            : undefined
                        }
                      >
                        {option.label}
                      </Toggle>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            {highCount} high-priority field{highCount === 1 ? "" : "s"} (
            {highCountValid ? "within" : "outside"} the engine's 1..
            {MAX_HIGH_PRIORITY_FIELDS} limit)
            {highCount >= MAX_HIGH_PRIORITY_FIELDS
              ? " — lower a High field before raising another"
              : ""}
          </p>
          <Button onClick={() => submit()} disabled={!canSubmit || busy} size="sm">
            {busy ? "Applying…" : "Set priorities"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Queued priorities are applied by the engine on the <strong>next turn advance</strong> —
          the engine remains the only writer of research state. Projected points use the engine's
          largest-remainder split over the budget and current weights.
        </p>
      </GlassSection>

      <GlassSection
        icon={<Beaker className="h-4 w-4 text-muted-foreground" />}
        title="In-progress technology work"
        description="Invested points per technology from the compiled snapshot."
      >
        {state.projection.inProgressTechnologies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No technology work recorded yet</p>
        ) : (
          <div className="space-y-1.5">
            {state.projection.inProgressTechnologies.map((tech) => (
              <div
                key={tech.techId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{tech.techId}</span>
                  {tech.completed && <Badge variant="secondary">completed</Badge>}
                  {tech.techId === state.projection.currentProjectTechId && (
                    <Badge variant="outline">current project</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {tech.investedPoints.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassSection>
    </div>
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
