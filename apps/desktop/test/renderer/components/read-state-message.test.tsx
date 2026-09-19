import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReadStateMessage } from "../../../src/renderer/components/shared/ReadStateMessage.js";

/** group-i ticket 08: the shell a screen renders while its read is loading, failed or empty. */

afterEach(cleanup);

describe("ReadStateMessage", () => {
  it("renders a labelled, focusable main region with the title and one line", () => {
    render(<ReadStateMessage title="Scouting Knowledge" label="Scouting knowledge" focusId="scouting" message="Loading..." />);
    const main = screen.getByRole("main", { name: "Scouting knowledge" });
    expect(main.getAttribute("data-focus-id")).toBe("scouting");
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByRole("heading", { level: 1, name: "Scouting Knowledge" })).toBeTruthy();
    expect(screen.getByText("Loading...").className).toBe("mt-4 text-text-secondary italic");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps any action passed as children inside the region", () => {
    render(
      <ReadStateMessage title="T" label="T" focusId="training" message="Empty.">
        <button type="button">Go</button>
      </ReadStateMessage>,
    );
    expect(screen.getByRole("main", { name: "T" }).querySelector("button")?.textContent).toBe("Go");
  });
});
