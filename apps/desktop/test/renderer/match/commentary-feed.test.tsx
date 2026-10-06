import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { CommentaryLineView } from "@cm-clone/contracts";
import { CommentaryFeed } from "../../../src/renderer/match/CommentaryFeed.js";

const line = (minute: number, tag: string, text: string) => new CommentaryLineView({ minute, tag, text });

const LINES = [
  line(0, "MatchStarted", "Kick-off."),
  line(12, "Goal", "GOAL! Home 1-0 Away."),
  line(45, "HalfTimeReached", "Half time."),
  line(90, "FullTimeWhistle", "Full time."),
];

afterEach(cleanup);

/** Gives the log a fixed viewport over `scrollHeight` px of content; jsdom does no layout. */
const sizeLog = (log: HTMLElement, scrollHeight: number) => {
  Object.defineProperty(log, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(log, "clientHeight", { configurable: true, value: 100 });
};

describe("CommentaryFeed", () => {
  it("is a log, and labels the match's phases instead of giving them a minute", () => {
    render(<CommentaryFeed lines={LINES} emptyMessage="Nothing yet." />);
    const rows = within(screen.getByRole("log", { name: "Commentary" })).getAllByRole("listitem");
    expect(rows.map((row) => row.firstElementChild?.textContent)).toEqual(["KO", "12'", "HT", "FT"]);
  });

  it("shows the empty message until a line arrives", () => {
    render(<CommentaryFeed lines={[]} emptyMessage="Nothing yet." />);
    expect(screen.getByText("Nothing yet.")).toBeTruthy();
  });

  it("never draws a silent line, even if it carried text the engine meant only to record", () => {
    const silent = new CommentaryLineView({ minute: 30, tag: "PossessionTally", text: "Recorded only.", silent: true });
    render(<CommentaryFeed lines={[...LINES, silent]} emptyMessage="" />);
    expect(screen.queryByText("Recorded only.")).toBeNull();
    const rows = within(screen.getByRole("log", { name: "Commentary" })).getAllByRole("listitem");
    expect(rows).toHaveLength(LINES.length);
  });

  it("follows the newest line, but not once the reader has scrolled up", () => {
    const { rerender } = render(<CommentaryFeed lines={LINES.slice(0, 2)} emptyMessage="" />);
    const log = screen.getByRole("log");

    sizeLog(log, 300);
    rerender(<CommentaryFeed lines={LINES.slice(0, 3)} emptyMessage="" />);
    expect(log.scrollTop).toBe(300);

    log.scrollTop = 50;
    fireEvent.scroll(log);
    sizeLog(log, 400);
    rerender(<CommentaryFeed lines={LINES} emptyMessage="" />);
    expect(log.scrollTop).toBe(50);
  });
});
