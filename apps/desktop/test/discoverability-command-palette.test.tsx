// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "../src/renderer/discoverability/CommandPalette.js";
import { registerActionHandler, resetActionHandlers } from "../src/renderer/actions/dispatch.js";
import { ACTION_REGISTRY } from "../src/renderer/actions/allActions.js";

// react-hotkeys-hook matches specific hotkeys by `event.code`, which jsdom
// leaves "" unless the init carries it — so every synthetic keydown passes code.
const keyDown = (code: string, init: Record<string, unknown> = {}): void => {
  act(() => fireEvent.keyDown(document, { key: code, code, ...init }));
};

const typeQuery = (value: string): void => {
  const input = screen.getByRole("combobox");
  act(() => fireEvent.change(input, { target: { value } }));
};

const optionFor = (label: RegExp): HTMLElement => screen.getByRole("option", { name: label });

const transfersState = () => ({ ready: true });

const seasonCompleteState = () => ({ ready: true, phase: "season_complete", advancing: false });

beforeEach(() => {
  cleanup();
  resetActionHandlers();
});

afterEach(() => {
  cleanup();
  resetActionHandlers();
});

describe("AC-23 — the palette lists global + current-screen Actions, available above unavailable", () => {
  it("opens with the live registry set: a global Action and the current screen's Actions", () => {
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={() => undefined} />);
    // app-global (Open keyboard help) and transfers-scoped (Focus the bid workflow).
    expect(optionFor(/Open keyboard help/)).toBeTruthy();
    expect(optionFor(/Focus the bid workflow/)).toBeTruthy();
    // An Action from another screen is never listed (no all-screens noise).
    expect(screen.queryByRole("option", { name: /Advance.*Calendar/i })).toBeNull();
  });

  it("AC-36 — offers the Rebind… command that opens the rebinding surface", () => {
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={() => undefined} />);
    const rebind = optionFor(/Rebind…/);
    expect(rebind).toBeTruthy();
    // The command is dispatchable by id like every other registry Action (the spine registers the
    // handler that opens the help overlay).
    expect(rebind.getAttribute("data-action-id")).toBe("open-rebind");
  });

  it("ranks available above unavailable and shows unavailable entries disabled-with-reason, never hidden", () => {
    render(<CommandPalette screen="league" state={seasonCompleteState()} overrides={{}} onClose={() => undefined} />);
    const continueOption = optionFor(/Continue/);
    const advanceOption = optionFor(/Advance the Calendar/);
    // Present (never hidden), disabled, with the per-predicate plain-language reason.
    expect(continueOption.getAttribute("aria-disabled")).toBe("true");
    expect(advanceOption.getAttribute("aria-disabled")).toBe("true");
    expect(continueOption.textContent).toContain("The Calendar cannot advance right now.");

    const options = [...document.querySelectorAll('[role="option"]')] as HTMLElement[];
    const ids = options.map((el) => el.getAttribute("data-action-id"));
    // Available actions rank above unavailable: the first row is available...
    expect(options[0]!.getAttribute("aria-disabled")).not.toBe("true");
    // ...and the unavailable pairs are last (still listed — never hidden).
    const lastTwo = ids.slice(-2);
    expect(lastTwo.sort()).toEqual(["advance-calendar", "continue"]);
  });

  it("typing filters to matching commands and drops everything else (strict command surface)", () => {
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={() => undefined} />);
    typeQuery("go to squad");
    expect(optionFor(/Go to Squad/)).toBeTruthy();
    expect(screen.getAllByRole("option").length).toBe(1);
  });

  it("a query matching no command renders an empty state, not a game-data search result", () => {
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={() => undefined} />);
    typeQuery("Roberto Carlos");
    expect(screen.getByText("No matching commands")).toBeTruthy();
    expect(document.querySelectorAll('[role="option"]').length).toBe(0);
  });
});

describe("AC-23 — palette keyboard operation", () => {
  it("ArrowDown/ArrowUp rove the selection (aria-activedescendant follows)", () => {
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={() => undefined} />);
    const input = screen.getByRole("combobox", { hidden: false }) as HTMLInputElement;
    input.focus();
    expect(input.getAttribute("aria-activedescendant")).toBe("palette-option-0");
    keyDown("ArrowDown");
    expect(input.getAttribute("aria-activedescendant")).toBe("palette-option-1");
    keyDown("ArrowUp");
    expect(input.getAttribute("aria-activedescendant")).toBe("palette-option-0");
  });

  it("Enter dispatches the selected Action record (not instant navigation) and closes", () => {
    const dispatch = vi.fn();
    const close = vi.fn();
    registerActionHandler("go-to-squad", dispatch);
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={close} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    typeQuery("go to squad");
    keyDown("Enter");
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("Enter on an unavailable entry neither dispatches nor closes", () => {
    const dispatch = vi.fn();
    const close = vi.fn();
    registerActionHandler("continue", dispatch);
    render(<CommandPalette screen="league" state={seasonCompleteState()} overrides={{}} onClose={close} />);
    const input = screen.getByRole("combobox") as HTMLInputElement;
    input.focus();
    // Bring the list down to the disabled Continue entry.
    typeQuery("continue");
    expect(optionFor(/Continue/).getAttribute("aria-disabled")).toBe("true");
    keyDown("Enter");
    expect(dispatch).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("Escape closes without dispatching anything", () => {
    const close = vi.fn();
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={close} />);
    (screen.getByRole("combobox") as HTMLInputElement).focus();
    keyDown("Escape");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("clicking an available entry dispatches its Action and closes", () => {
    const dispatch = vi.fn();
    const close = vi.fn();
    registerActionHandler("go-to-squad", dispatch);
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={close} />);
    act(() => fireEvent.mouseDown(optionFor(/Go to Squad/)));
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("AC-16 — the palette only lists Actions the registry can dispatch", () => {
  it("every rendered option id resolves in the registry (no half-migrated lie)", () => {
    render(<CommandPalette screen="transfers" state={transfersState()} overrides={{}} onClose={() => undefined} />);
    for (const el of document.querySelectorAll('[role="option"]')) {
      const id = el.getAttribute("data-action-id");
      expect(id, "palette option carries an action id").toBeTruthy();
      expect(ACTION_REGISTRY.get(id!), `registry missing ${id}`).toBeDefined();
    }
  });
});