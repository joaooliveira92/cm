// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readTeachingSplashSeen,
  TeachingSplash,
  teachingSplashStorageKey,
  useTeachingSplashVisibility,
  writeTeachingSplashSeen,
} from "../src/renderer/discoverability/TeachingSplash.js";

const keyDown = (code: string): void => {
  act(() => fireEvent.keyDown(document, { key: code, code }));
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("AC-26 — one-shot persistence (before/after splash)", () => {
  it("reads false before the splash is seen and true after it is written", () => {
    window.localStorage.clear();
    expect(readTeachingSplashSeen()).toBe(false);
    writeTeachingSplashSeen();
    expect(readTeachingSplashSeen()).toBe(true);
    expect(window.localStorage.getItem(teachingSplashStorageKey)).toBe("1");
  });

  it("the visor starts visible when never seen, and dismissal is remembered forever", async () => {
    let rendered: { visible: boolean; dismiss: () => void };
    const Probe = () => {
      rendered = useTeachingSplashVisibility();
      return null;
    };
    window.localStorage.clear();
    render(<Probe />);
    expect(rendered!.visible).toBe(true);
    // Dismissal applies on the next turn (the renderer must never tear the
    // splash down inside a trusted event's synchronous commit — see the
    // dismiss() comment), so the flag flips immediately but the visibility
    // state settles on the following macrotask.
    act(() => rendered!.dismiss());
    expect(readTeachingSplashSeen()).toBe(true);
    await waitFor(() => expect(rendered!.visible).toBe(false));

    // A fresh mount (e.g. next career screen / next session) never re-shows.
    cleanup();
    render(<Probe />);
    expect(rendered!.visible).toBe(false);
  });
});

describe("AC-14/AC-26 — exactly three shortcuts, dismissible", () => {
  it("shows exactly three shortcut keys: palette, help, navigation prefix", () => {
    render(<TeachingSplash onDismiss={() => undefined} />);
    const keys = [...document.querySelectorAll("kbd")].map((el) => el.textContent);
    expect(keys).toContain("Cmd+K");
    expect(keys).toContain("Cmd+/");
    expect(keys.length).toBe(3);
    // No full binding table, no extra rows.
    expect(screen.getByRole("dialog", { name: /Playing a new career/i })).toBeTruthy();
  });

  it("the dismiss button focuses itself on mount and dismisses on click", () => {
    const onDismiss = vi.fn();
    render(<TeachingSplash onDismiss={onDismiss} />);
    const button = screen.getByRole("button", { name: "Got it" });
    expect(button).toBe(document.activeElement);
    fireEvent.click(button);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("Escape dismisses like any transient layer", () => {
    const onDismiss = vi.fn();
    render(<TeachingSplash onDismiss={onDismiss} />);
    keyDown("Escape");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});