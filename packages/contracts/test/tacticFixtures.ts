import { builtInTemplate, tacticFromTemplate } from "@cm-clone/shared";

/** A complete Tactic on the wire with a non-default value in every kind of field: a non-default
 *  template with runs, a changed team instruction, slot instruction and set-piece role, and takers. */
export const completeTactic = () => {
  const ids = Array.from({ length: 18 }, (_, i) => `p${i}`);
  const base = tacticFromTemplate(builtInTemplate("4-3-3")!, ids.slice(0, 11), ids.slice(11));
  return JSON.parse(
    JSON.stringify({
      ...base,
      sourceTemplate: "My Chasing Shape",
      team: { ...base.team, passing: "long", offsideTrap: true, mentality: "gungHo" },
      teamSetPieces: { ...base.teamSetPieces, cornersLeft: "short", throwInsRight: "quick" },
      slots: base.slots.map((slot, index) =>
        index === 9
          ? {
              ...slot,
              run: { row: "AM", column: "C" },
              instructions: { ...slot.instructions, marking: "man", crossAim: "farPost", longShots: "often" },
              setPieceRoles: { ...slot.setPieceRoles, attackCorner: "nearPostFlickOn" },
            }
          : slot,
      ),
      takers: { ...base.takers, captain: ["p3", "p4"], penalties: ["p9"], freeKicksLeft: ["p9", "p5"] },
    }),
  );
};


export const club = { id: "c1", name: "Castlemere United", statureTier: "big" };
