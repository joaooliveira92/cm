import { describe, expect, it } from "vitest";
import { suggestedSaveName } from "../../../src/renderer/create/suggestedSaveName.js";

// Local time, so the expected stamp does not depend on the machine's time zone.
const AT = new Date(2026, 8, 27, 14, 5);

describe("suggestedSaveName", () => {
  it("joins the manager, favorite club, chosen club, and timestamp with underscores", () => {
    expect(
      suggestedSaveName({
        firstName: "Joao",
        lastName: "Oliveira",
        favoriteClub: "Benfica",
        teamChosen: "Porto",
        timestamp: AT,
      }),
    ).toBe("Joao_Oliveira_Benfica_Porto_20260927-1405");
  });

  it("leaves the favorite club out when the manager supports none", () => {
    expect(
      suggestedSaveName({
        firstName: "Joao",
        lastName: "Oliveira",
        favoriteClub: null,
        teamChosen: "Porto",
        timestamp: AT,
      }),
    ).toBe("Joao_Oliveira_Porto_20260927-1405");
  });

  it("keeps every name one segment and drops characters no file system accepts", () => {
    expect(
      suggestedSaveName({
        firstName: "  Ana Maria ",
        lastName: "de_Souza",
        favoriteClub: "Castlemere United",
        teamChosen: "A/B: \"Rovers\"?",
        timestamp: AT,
      }),
    ).toBe("Ana-Maria_de-Souza_Castlemere-United_AB-Rovers_20260927-1405");
  });
});
