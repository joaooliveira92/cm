import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommentaryLineView, MatchSummary } from "@cm-clone/contracts";
import { CommentaryBar } from "../../../src/renderer/match/CommentaryBar.js";
import {
  COMMENTARY_SPEED_STORAGE_KEY,
  getCommentarySpeed,
  resetCommentarySpeedCache,
} from "../../../src/renderer/match/commentarySpeed.js";
import { MATCH_COLOURS } from "./matchColours.js";

const MATCH = {
  matchId: "m1",
  fixtureId: 1,
  homeClubId: "home",
  homeClubName: "Home FC",
  awayClubId: "away",
  awayClubName: "Away FC",
  ...MATCH_COLOURS,
  isHome: true,
} as unknown as MatchSummary;

const line = (fields: Partial<CommentaryLineView> & { readonly text: string }): CommentaryLineView =>
  ({ minute: 10, tag: "Foul", ...fields }) as CommentaryLineView;

/** The bar's visible surface: hidden from screen readers, so found by its text. */
const surface = (text: string) => screen.getByText(text).parentElement!;

beforeEach(() => {
  window.localStorage.removeItem(COMMENTARY_SPEED_STORAGE_KEY);
  resetCommentarySpeedCache();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CommentaryBar", () => {
  it("shows the latest line that is not quiet, in its club's colours", () => {
    render(
      <CommentaryBar
        match={MATCH}
        playing={null}
        revealed={[line({ text: "Away foul.", clubId: "away" as never }), line({ text: "Quiet pass.", quiet: true, clubId: "home" as never })]}
      />,
    );
    expect(screen.queryByText("Quiet pass.")).toBeNull();
    expect(surface("Away foul.").style.backgroundColor).toBe(MATCH_COLOURS.awayClubColours.primary.background);
  });

  it("grows a playing line part by part", () => {
    const goal = line({ tag: "Goal", text: "Ada shoots… GOAL!" });
    const parts = [
      { text: "Ada shoots…", delayMs: 1000 },
      { text: "GOAL!", delayMs: 2000 },
    ];
    const { rerender } = render(<CommentaryBar match={MATCH} playing={{ line: goal, parts, shown: 1 }} revealed={[]} />);
    expect(screen.getByText("Ada shoots…")).toBeTruthy();
    rerender(<CommentaryBar match={MATCH} playing={{ line: goal, parts, shown: 2 }} revealed={[]} />);
    expect(screen.getByText("Ada shoots… GOAL!")).toBeTruthy();
  });

  it("blinks a flash line once it lands, then settles", () => {
    vi.useFakeTimers();
    const { rerender } = render(<CommentaryBar match={MATCH} playing={null} revealed={[]} />);
    const goal = line({ tag: "Goal", text: "GOAL!", flash: true, clubId: "home" as never });
    rerender(<CommentaryBar match={MATCH} playing={null} revealed={[goal]} />);
    expect(surface("GOAL!").dataset["flashing"]).toBe("true");
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(surface("GOAL!").dataset["flashing"]).toBe("false");
  });

  it("holds a flash line inverted instead of blinking it when the system asks for reduced motion", () => {
    vi.useFakeTimers();
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)" }));
    const { rerender } = render(<CommentaryBar match={MATCH} playing={null} revealed={[]} />);
    rerender(<CommentaryBar match={MATCH} playing={null} revealed={[line({ tag: "Goal", text: "GOAL!", flash: true })]} />);
    const states: Array<string | undefined> = [];
    for (let step = 0; step < 6; step++) {
      states.push(surface("GOAL!").dataset["flashing"]);
      act(() => {
        vi.advanceTimersByTime(220);
      });
    }
    expect(states).toEqual(["true", "true", "true", "true", "true", "true"]);
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(surface("GOAL!").dataset["flashing"]).toBe("false");
    vi.unstubAllGlobals();
  });

  it("does not blink a flash line that was already on screen when the bar mounted", () => {
    render(<CommentaryBar match={MATCH} playing={null} revealed={[line({ tag: "Goal", text: "GOAL!", flash: true })]} />);
    expect(surface("GOAL!").dataset["flashing"]).toBe("false");
  });

  it("sets the commentary speed, and keeps it for the next match", () => {
    render(<CommentaryBar match={MATCH} playing={null} revealed={[]} />);
    const group = screen.getByRole("group", { name: "Commentary speed" });
    expect(group.querySelector("[aria-pressed=true]")?.textContent).toBe("Normal");

    fireEvent.click(screen.getByRole("button", { name: "Fast" }));
    expect(screen.getByRole("button", { name: "Fast" }).getAttribute("aria-pressed")).toBe("true");
    resetCommentarySpeedCache();
    expect(getCommentarySpeed()).toBe("fast");
  });
});
