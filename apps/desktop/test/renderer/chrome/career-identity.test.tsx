import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ClubColoursView } from "@cm-clone/contracts";
import { CareerIdentity } from "../../../src/renderer/chrome/header/CareerIdentity.js";

/**
 * The identity zone used to be assertable only through the whole navbar. It is its
 * own part since the primary navigation moved to a sidebar, so these mount it
 * directly — the crest and the screen identity never needed a router.
 */
const SAMPLE_COLOURS: ClubColoursView = {
  primary: { foreground: "#ffffff", background: "#000000" },
  secondary: { foreground: "#000000", background: "#ffffff" },
  tertiary: null,
  quaternary: null,
};

beforeEach(() => {
  cleanup();
});

afterEach(() => {
  cleanup();
});

describe("the club badge in the header identity zone", () => {
  it("shows the colour-and-initials shield when badgeKey is null", () => {
    render(
      <CareerIdentity
        clubName="Northport Rovers"
        clubColours={SAMPLE_COLOURS}
        badgeKey={null}
        identity={null}
      />,
    );
    expect(screen.getByRole("img", { name: "Northport Rovers crest" })).toBeTruthy();
  });

  it("shows the fallback shield when badgeKey is given but the image is unavailable", () => {
    render(
      <CareerIdentity
        clubName="Northport Rovers"
        clubColours={SAMPLE_COLOURS}
        badgeKey="eng/northport-rovers"
        identity={null}
      />,
    );
    expect(screen.getByRole("img", { name: "Northport Rovers crest" })).toBeTruthy();
  });

  it("renders neither badge nor shield when clubColours is not set", () => {
    render(
      <CareerIdentity
        clubName="Northport Rovers"
        clubColours={null}
        badgeKey={null}
        identity={null}
      />,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Northport Rovers")).toBeTruthy();
  });
});

describe("a screen's identity in place of the club name", () => {
  it("names the player and their club, with the facts line beneath", () => {
    render(
      <CareerIdentity
        clubName="Northport Rovers"
        clubColours={null}
        badgeKey={null}
        identity={{
          name: "Florian David",
          qualifier: "Benfica",
          facts: "GK, France, Age 22",
          player: {
            overallRating: { _tag: "exact", value: 60 },
            transferValue: { _tag: "exact", value: 0 },
            wage: null,
            contractExpiry: "2 years",
            injury: "None",
          },
        }}
      />,
    );
    expect(screen.getByText("Florian David", { exact: false })).toBeTruthy();
    expect(screen.getByText("(Benfica)")).toBeTruthy();
    expect(screen.getByText("GK, France, Age 22")).toBeTruthy();
    expect(screen.queryByText("Northport Rovers")).toBeNull();
  });
});
