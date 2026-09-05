// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../src/renderer/components/ui/select.js";

afterEach(cleanup);

const items = [
  { label: "Alpha", value: "a" },
  { label: "Bravo", value: "b" },
];

function Demo({ value }: { value: string }) {
  return (
    <Select value={value} items={items} onValueChange={() => {}}>
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

/**
 * The trigger only reflects a selection when the value is fed back in, so the
 * "opens and selects" case needs a stateful owner. A fixed `value` prop leaves
 * the trigger showing its original label no matter what the user clicks.
 */
function StatefulDemo({ onValueChange }: { onValueChange: (value: string) => void }) {
  const [value, setValue] = React.useState("a");
  return (
    <Select
      value={value}
      items={items}
      onValueChange={(next) => {
        setValue(next as string);
        onValueChange(next as string);
      }}
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

describe("ui select", () => {
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

    const selected: Array<string> = [];
    render(<StatefulDemo onValueChange={(value) => selected.push(value)} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Pick one" }));
    const option = await screen.findByRole("option", { name: "Bravo" });

    // Base UI commits a selection on the pointer sequence, not on a bare click.
    fireEvent.pointerDown(option, { button: 0, pointerType: "mouse" });
    fireEvent.pointerUp(option, { button: 0, pointerType: "mouse" });
    fireEvent.click(option, { button: 0 });

    await waitFor(() => expect(selected).toEqual(["b"]));
    await waitFor(() =>
      expect(screen.getByRole("combobox", { name: "Pick one" }).textContent).toContain("Bravo"),
    );
  });
});
