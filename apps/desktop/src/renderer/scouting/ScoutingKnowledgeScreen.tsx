/**
 * Scouting Knowledge screen (Screen 126) — a sub-surface of Scouting.
 *
 * What the manager's club has scouted, read from `getScoutingKnowledge`: a coverage summary, then a
 * Club view (each Club with a scouted Player, how many are scouted, coverage and Knowledge
 * Confidence) and a Player view (each scouted Player, their Club and Scouting Progress). It shows
 * coverage and never figures: the read carries no Attribute, Attribute Range or Transfer Value.
 *
 * A save with no scouting is an ordinary empty state, not an error. Read-only, so an Archived Save
 * renders the same way.
 *
 * Reached from the Recruitment submenu at `/career/$saveId/scouting-knowledge`, in the `scouting`
 * screen scope.
 */
import type { KnowledgeClubView, KnowledgePlayerView, SaveId } from "@cm-clone/contracts";
import { ReadStateMessage } from "../components/shared/ReadStateMessage.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.js";
import { FOCUS_RING } from "../focus.js";
import { readState, scoutingKnowledgeAtom, useAtomValue } from "../rpc.js";
import { confidenceLabel } from "./reportSections.js";
import {
  ScoutingCoverageSummary,
  coverageLabel,
  scoutingProgressLabel,
} from "./ScoutingCoverageSummary.js";

const PAGE_CLASS = `bg-background p-8 text-foreground ${FOCUS_RING.join(" ")}`;

export const ScoutingKnowledgeScreen = ({ saveId }: { readonly saveId: SaveId }) => {
  const result = readState(useAtomValue(scoutingKnowledgeAtom(saveId)), {
    loading: "Loading scouting knowledge...",
    failed: "Scouting knowledge could not be loaded.",
  });
  if (result._tag !== "Ready") {
    return (
      <ReadStateMessage
        title="Scouting Knowledge"
        label="Scouting Knowledge"
        focusId="scouting"
        message={result.message}
      />
    );
  }

  const knowledge = result.value;
  return (
    <main
      data-focus-id="scouting"
      aria-labelledby="scouting-knowledge-heading"
      className={PAGE_CLASS}
      tabIndex={-1}
    >
      <header>
        <h1 id="scouting-knowledge-heading" className="text-2xl font-bold">
          Scouting Knowledge
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          How far your club's Scouting Progress reaches, by Club and by Player.
        </p>
      </header>

      <ScoutingCoverageSummary knowledge={knowledge} />

      <Tabs defaultValue="clubs" className="mt-8">
        <TabsList aria-label="Knowledge views">
          <TabsTrigger value="clubs">Clubs</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>
        <TabsContent value="clubs">
          <ClubKnowledge clubs={knowledge.clubs} />
        </TabsContent>
        <TabsContent value="players">
          <PlayerKnowledge players={knowledge.players} />
        </TabsContent>
      </Tabs>
    </main>
  );
};

const ClubKnowledge = ({ clubs }: { readonly clubs: ReadonlyArray<KnowledgeClubView> }) => {
  if (clubs.length === 0) {
    return <p className="text-text-secondary italic">No Club has a scouted Player yet.</p>;
  }
  return (
    <Table aria-label="Scouted Clubs">
      <TableHeader>
        <TableRow>
          <TableHead>Club</TableHead>
          <TableHead>Players scouted</TableHead>
          <TableHead>Fully Scouted</TableHead>
          <TableHead>Coverage</TableHead>
          <TableHead>Knowledge Confidence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clubs.map((club) => (
          <TableRow key={club.clubId} aria-label={club.clubName}>
            <TableCell className="font-semibold">{club.clubName}</TableCell>
            <TableCell className="tabular-nums">
              {club.scoutedCount} of {club.squadSize}
            </TableCell>
            <TableCell className="tabular-nums">{club.fullyScoutedCount}</TableCell>
            <TableCell className="tabular-nums">{coverageLabel(club.coverage)}</TableCell>
            <TableCell>{confidenceLabel(club.knowledgeConfidence)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const PlayerKnowledge = ({ players }: { readonly players: ReadonlyArray<KnowledgePlayerView> }) => {
  if (players.length === 0) {
    return <p className="text-text-secondary italic">No Player has been scouted yet.</p>;
  }
  return (
    <Table aria-label="Scouted Players">
      <TableHeader>
        <TableRow>
          <TableHead>Player</TableHead>
          <TableHead>Club</TableHead>
          <TableHead>Scouting Progress</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((player) => {
          const name = `${player.firstName} ${player.lastName}`;
          return (
            <TableRow key={player.playerId} aria-label={name}>
              <TableCell className="font-semibold">{name}</TableCell>
              <TableCell>{player.clubName ?? "Free Agent"}</TableCell>
              <TableCell className="tabular-nums">{scoutingProgressLabel(player.progress)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
