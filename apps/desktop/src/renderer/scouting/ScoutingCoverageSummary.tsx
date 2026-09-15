import type { ScoutingKnowledgeView } from "@cm-clone/contracts";
import { FULLY_SCOUTED, KNOWLEDGE_CONFIDENCES } from "@cm-clone/shared";
import { confidenceLabel } from "./reportSections.js";

/** A scouted Player's Scouting Progress in words: a floored percentage, or Fully Scouted at 100. */
export const scoutingProgressLabel = (progress: number): string =>
  progress >= FULLY_SCOUTED ? "Fully Scouted" : `${Math.floor(Math.max(0, progress))}%`;

/** A Club's coverage (0-1) as a floored percentage, so a squad one point short never reads 100%. */
export const coverageLabel = (coverage: number): string =>
  `${Math.floor(Math.min(1, Math.max(0, coverage)) * 100)}%`;

/**
 * The coverage summary: how many Clubs and Players the club has scouted, how many are Fully Scouted,
 * and how the scouted Clubs spread across Knowledge Confidence.
 *
 * Props only, so the Scouting Knowledge screen (126) and the Scouting Centre (118) render the same
 * summary from the same `getScoutingKnowledge` read. It reads no atom, route or context.
 */
export const ScoutingCoverageSummary = ({ knowledge }: { readonly knowledge: ScoutingKnowledgeView }) => {
  const { clubs, players } = knowledge;
  if (players.length === 0) {
    return (
      <section aria-label="Scouting coverage" className="mt-6 text-sm text-text-secondary">
        <p>Nothing scouted yet. Every Player outside your squad is Unscouted.</p>
      </section>
    );
  }
  const fullyScouted = players.filter((player) => player.progress >= FULLY_SCOUTED).length;
  const bands = KNOWLEDGE_CONFIDENCES.map((confidence) => ({
    confidence,
    count: clubs.filter((club) => club.knowledgeConfidence === confidence).length,
  })).filter((band) => band.count > 0);

  return (
    <section
      aria-label="Scouting coverage"
      className="mt-6 rounded-panel border border-panel-border bg-card p-4 text-sm text-card-foreground shadow-panel"
    >
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
        <dt className="text-text-secondary">Clubs with scouted Players</dt>
        <dd className="tabular-nums">{clubs.length}</dd>
        <dt className="text-text-secondary">Players scouted</dt>
        <dd className="tabular-nums">{players.length}</dd>
        <dt className="text-text-secondary">Fully Scouted</dt>
        <dd className="tabular-nums">{fullyScouted}</dd>
        {bands.length > 0 && (
          <>
            <dt className="text-text-secondary">Knowledge Confidence</dt>
            <dd>
              {bands
                .map(
                  (band) =>
                    `${confidenceLabel(band.confidence)}: ${band.count} ${band.count === 1 ? "Club" : "Clubs"}`,
                )
                .join(" · ")}
            </dd>
          </>
        )}
      </dl>
    </section>
  );
};
