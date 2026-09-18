import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { WorkloadGauge } from "../../../src/renderer/training/WorkloadGauge.js";

afterEach(() => cleanup());

describe("ticket 05 — WorkloadGauge is a self-contained, props-only component", () => {
  // Rendered bare — no RegistryProvider, no router, no preload bridge. If the gauge ever reaches for
  // an atom or a route it throws here, which is what keeps it liftable into Screens 105 and 114.
  it("renders outside any provider, from props alone", () => {
    render(<WorkloadGauge playerName="Rui Costa" condition={40} recovery="rest" lastInjurySeverity="severe" />);
    expect(screen.getByRole("meter", { name: "Rui Costa Condition" })).toBeTruthy();
  });

  it("shows a Rest player with the injury Severity, flooring Condition so 74.6 never reads as 75", () => {
    render(<WorkloadGauge playerName="Rui Costa" condition={74.6} recovery="rest" lastInjurySeverity="severe" />);
    const meter = screen.getByRole("meter", { name: "Rui Costa Condition" });
    expect(meter.getAttribute("aria-valuenow")).toBe("74");
    expect(meter.getAttribute("aria-valuetext")).toBe("74%, Rest");
    expect(screen.getByText("Condition 74%")).toBeTruthy();
    expect(screen.getByText("Rest")).toBeTruthy();
    expect(screen.getByText("Last injury this Season: severe")).toBeTruthy();
  });

  it("shows a player at the threshold as Active", () => {
    render(<WorkloadGauge playerName="Ana Reis" condition={75} recovery="active" lastInjurySeverity="none" />);
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toBe("75%, Active");
  });

  it("fills the bar to the Condition percentage", () => {
    const { container } = render(
      <WorkloadGauge playerName="Ana Reis" condition={100} recovery="active" lastInjurySeverity="none" />,
    );
    const fill = screen.getByRole("meter").firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(container.querySelector("[data-recovery]")?.getAttribute("data-recovery")).toBe("active");
    expect(screen.getByText("No injury this Season")).toBeTruthy();
  });

  it("clamps an out-of-range Condition instead of overflowing the bar", () => {
    render(<WorkloadGauge playerName="Ana Reis" condition={140} recovery="active" lastInjurySeverity="none" />);
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-valuenow")).toBe("100");
    expect((meter.firstElementChild as HTMLElement).style.width).toBe("100%");
    cleanup();

    render(<WorkloadGauge playerName="Ana Reis" condition={-5} recovery="rest" lastInjurySeverity="none" />);
    const low = screen.getByRole("meter");
    expect(low.getAttribute("aria-valuenow")).toBe("0");
    expect((low.firstElementChild as HTMLElement).style.width).toBe("0%");
    expect(screen.getByText("Rest")).toBeTruthy();
  });
});
