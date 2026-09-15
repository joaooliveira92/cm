// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CoachCard } from "../../../src/renderer/training/CoachCard.js";

afterEach(() => cleanup());

describe("ticket 04 — CoachCard renders name, quality, and department", () => {
  it("renders the coach's name", () => {
    render(
      <ul aria-label="Coaching staff">
        <CoachCard name="Diane Wax" quality={14} department="coaching" />
      </ul>,
    );
    expect(screen.getByText("Diane Wax")).toBeTruthy();
  });

  it("renders the quality rating as N/20", () => {
    render(
      <ul aria-label="Coaching staff">
        <CoachCard name="Diane Wax" quality={14} department="coaching" />
      </ul>,
    );
    expect(screen.getByText("14/20")).toBeTruthy();
  });

  it("renders the department name", () => {
    render(
      <ul aria-label="Coaching staff">
        <CoachCard name="Diane Wax" quality={14} department="coaching" />
      </ul>,
    );
    expect(screen.getByText("coaching")).toBeTruthy();
  });

  it("has a listitem role for a11y integration", () => {
    render(
      <ul aria-label="Coaching staff">
        <CoachCard name="Diane Wax" quality={14} department="coaching" />
      </ul>,
    );
    const item = screen.getByRole("listitem");
    expect(item.getAttribute("aria-label")).toBe("Coach Diane Wax, quality 14");
  });
});