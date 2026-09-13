import type { ScoutingFindingView, TeamScoutReportView } from "@cm-clone/contracts";

type Confidence = TeamScoutReportView["knowledgeConfidence"];

/**
 * What changed between an earlier Team Scout Report reading and the current one. Pure, so the
 * Previous Reports tab renders it and tests read it without a screen.
 *
 * Everything is matched by identity, never by position in a list: findings by kind, area and note,
 * and key players by player id. A reordered list is therefore not a change. A player whose ability
 * range moved is listed as narrowed or widened, using the range the wire carries and never an exact
 * figure it withholds.
 */

export type FindingKind = "strength" | "weakness" | "set piece";

export interface FindingChange {
  readonly kind: FindingKind;
  readonly finding: ScoutingFindingView;
}

export interface RangeChange {
  readonly name: string;
  readonly from: readonly [number, number];
  readonly to: readonly [number, number];
}

export interface ReportComparison {
  /** `null` when unchanged. */
  readonly confidence: { readonly from: Confidence; readonly to: Confidence } | null;
  /** `null` when unchanged; either side is `null` when no formation was predicted then. */
  readonly formation: { readonly from: string | null; readonly to: string | null } | null;
  readonly findingsAdded: ReadonlyArray<FindingChange>;
  readonly findingsRemoved: ReadonlyArray<FindingChange>;
  readonly playersAdded: ReadonlyArray<string>;
  readonly playersRemoved: ReadonlyArray<string>;
  readonly rangesChanged: ReadonlyArray<RangeChange>;
}

const findingsOf = (report: TeamScoutReportView): ReadonlyArray<FindingChange> => [
  ...report.strengths.map((finding) => ({ kind: "strength" as const, finding })),
  ...report.weaknesses.map((finding) => ({ kind: "weakness" as const, finding })),
  ...report.setPieceFindings.map((finding) => ({ kind: "set piece" as const, finding })),
];

const findingKey = ({ kind, finding }: FindingChange): string =>
  `${kind}|${finding.area}|${finding.note}`;

const nameOf = (player: TeamScoutReportView["keyPlayers"][number]): string =>
  `${player.firstName} ${player.lastName}`;

export const compareReports = (
  previous: TeamScoutReportView,
  current: TeamScoutReportView,
): ReportComparison => {
  const before = findingsOf(previous);
  const after = findingsOf(current);
  const beforeKeys = new Set(before.map(findingKey));
  const afterKeys = new Set(after.map(findingKey));

  const beforePlayers = new Map(previous.keyPlayers.map((player) => [player.playerId, player]));
  const afterPlayers = new Map(current.keyPlayers.map((player) => [player.playerId, player]));

  const fromFormation = previous.predictedFormation?.formation ?? null;
  const toFormation = current.predictedFormation?.formation ?? null;

  return {
    confidence:
      previous.knowledgeConfidence === current.knowledgeConfidence
        ? null
        : { from: previous.knowledgeConfidence, to: current.knowledgeConfidence },
    formation: fromFormation === toFormation ? null : { from: fromFormation, to: toFormation },
    findingsAdded: after.filter((change) => !beforeKeys.has(findingKey(change))),
    findingsRemoved: before.filter((change) => !afterKeys.has(findingKey(change))),
    playersAdded: current.keyPlayers.filter((p) => !beforePlayers.has(p.playerId)).map(nameOf),
    playersRemoved: previous.keyPlayers.filter((p) => !afterPlayers.has(p.playerId)).map(nameOf),
    rangesChanged: current.keyPlayers.flatMap((player) => {
      const earlier = beforePlayers.get(player.playerId);
      if (
        earlier === undefined ||
        (earlier.abilityLow === player.abilityLow && earlier.abilityHigh === player.abilityHigh)
      ) {
        return [];
      }
      return [
        {
          name: nameOf(player),
          from: [earlier.abilityLow, earlier.abilityHigh] as const,
          to: [player.abilityLow, player.abilityHigh] as const,
        },
      ];
    }),
  };
};

/** Whether the two readings differ in anything the comparison reports. */
export const hasChanges = (comparison: ReportComparison): boolean =>
  comparison.confidence !== null ||
  comparison.formation !== null ||
  comparison.findingsAdded.length > 0 ||
  comparison.findingsRemoved.length > 0 ||
  comparison.playersAdded.length > 0 ||
  comparison.playersRemoved.length > 0 ||
  comparison.rangesChanged.length > 0;
