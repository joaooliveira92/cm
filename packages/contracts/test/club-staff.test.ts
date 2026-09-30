import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { AppRpcs } from "../src/rpc.js";
import { ClubStaffView } from "../src/schemas/index.js";

const roundTrip = <A, I>(schema: Schema.ConstraintCodec<A, I>, wire: unknown): void => {
  const decoded = Schema.decodeUnknownSync(schema)(wire);
  const encoded = Schema.encodeSync(schema)(decoded);
  expect(encoded).toEqual(wire);
};

describe("Club Staff view (Screen 38)", () => {
  const staffView = {
    club: { id: "c1", name: "Castlemere United", statureTier: "big" },
    // The club's kit rides on the view so the screen can paint its name in the right colours.
    clubColours: {
      primary: { foreground: "#ffffff", background: "#7c2d12" },
      secondary: { foreground: "#ffffff", background: "#431407" },
      tertiary: null,
      quaternary: null,
    },
    // Whose club it is rides on this view, so the screen needs no second read to mark a rival.
    isUserClub: false,
    groups: [
      { department: "executive", members: [{ key: "president-0", role: "president", firstName: "Alan", lastName: "Reyes" }] },
      {
        department: "coaching",
        members: [
          { key: "coach-0", role: "coach", firstName: "Beth", lastName: "Cross" },
          { key: "assistant-0", role: "assistant", firstName: "Finn", lastName: "Hale" },
        ],
      },
      {
        department: "recruitment",
        members: [
          { key: "scout-0", role: "scout", firstName: "Cara", lastName: "Devlin" },
          { key: "scout-1", role: "scout", firstName: "Dmitri", lastName: "Sorel" },
        ],
      },
      { department: "medical", members: [{ key: "physio-0", role: "physio", firstName: "Elsa", lastName: "Marchetti" }] },
    ],
  } as const;

  it("round-trips the backroom grouped by department", () => {
    roundTrip(ClubStaffView, staffView);
  });

  it("is the getClubStaff success schema, and rejects a role the derivation cannot produce", () => {
    expect(ClubStaffView).toBe(AppRpcs.getClubStaff.success);
    expect(() =>
      Schema.decodeUnknownSync(ClubStaffView)({
        ...staffView,
        groups: [
          {
            department: "executive",
            members: [{ key: "president-0", role: "chairman", firstName: "Alan", lastName: "Reyes" }],
          },
        ],
      }),
    ).toThrow();
  });

  it("getClubStaff payload round-trips saveId and clubId", () => {
    roundTrip(AppRpcs.getClubStaff.payload, { saveId: "s1", clubId: "club_eng_01" });
  });

  it("getClubStaff error schema round-trips each of its two failures", () => {
    roundTrip(AppRpcs.getClubStaff.error, { _tag: "SaveNotFoundError", id: "s1" });
    roundTrip(AppRpcs.getClubStaff.error, { _tag: "ClubNotFoundError", id: "club_nobody" });
  });
});
