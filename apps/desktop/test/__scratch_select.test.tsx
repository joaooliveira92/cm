// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../src/renderer/components/ui/select.js";

afterEach(cleanup);

function Demo({ value }: { value: string }) {
  return (
    <Select
      value={value}
      items={[
        { label: "Alpha", value: "a" },
        { label: "Bravo", value: "b" },
      ]}
      onValueChange={() => {}}
    >
      <SelectTrigger aria-label="Pick one">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Alpha</SelectItem>
        <SelectItem value="b">Bravo</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("scratch select", () => {
  it("shows label when closed", () => {
    render(<Demo value="b" />);
    const trigger = screen.getByRole("combobox", { name: "Pick one" });
    expect(trigger.textContent).toContain("Bravo");
  });
  it("opens and selects", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    (window as unknown as { requestAnimationFrame: (cb: () => void) => number }).requestAnimationFrame =
      (cb) => setTimeout(() => cb(), 16) as unknown as number;

    render(<Demo value="a" />);
    fireEvent.click(screen.getByRole("combobox", { name: "Pick one" }));
    const option = await screen.findByRole("option", { name: "Bravo" });
    fireEvent.click(option);
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Pick one" }).textContent).toContain("Bravo"),
    );
  });
});
