// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuitGuard } from "../../../src/renderer/quitGuard/QuitGuard.js";
import { Dialog, DialogContent, DialogTitle } from "../../../src/renderer/components/ui/dialog.js";

beforeEach(() => {
  window.electronAPI = {
    platform: "darwin",
    confirmQuit: vi.fn(),
    cancelQuit: vi.fn(),
    quitApplication: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

describe("QuitGuard", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<QuitGuard />);
    expect(container.innerHTML).toBe("");
  });

  it("portals the dialog to document.body on show-quit-guard event", () => {
    render(<QuitGuard />);
    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-label")).toBe("Quit");
  });

  it("calls cancelQuit and hides on Cancel click", () => {
    render(<QuitGuard />);
    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });

    const cancel = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancel);

    expect(window.electronAPI.cancelQuit).toHaveBeenCalledTimes(1);
    expect(document.body.querySelector('[role="dialog"]')).toBeFalsy();
  });

  it("calls confirmQuit on Quit click", () => {
    render(<QuitGuard />);
    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });

    const quit = screen.getByRole("button", { name: "Quit" });
    fireEvent.click(quit);

    expect(window.electronAPI.confirmQuit).toHaveBeenCalledTimes(1);
  });

  it("renders inside document.body, not in the mount container", () => {
    const { container } = render(<QuitGuard />);
    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(container.querySelector('[role="dialog"]')).toBeFalsy();
  });

  it("survives a Base UI Dialog open: quit dialog renders in document.body and receives clicks", () => {
    render(
      <>
        <Dialog open>
          <DialogContent>
            <DialogTitle>Confirm action</DialogTitle>
            <p>Are you sure?</p>
          </DialogContent>
        </Dialog>
        <QuitGuard />
      </>,
    );

    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });

    const quitDialog = document.body.querySelector('[role="dialog"][aria-label="Quit"]');
    expect(quitDialog).toBeTruthy();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancel);
    expect(window.electronAPI.cancelQuit).toHaveBeenCalledTimes(1);
  });
});