import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuitGuard } from "../../../src/renderer/quitGuard/QuitGuard.js";
import { Dialog, DialogContent, DialogTitle } from "../../../src/renderer/components/ui/dialog.js";
import {
  resetProvisionalCareer,
  setProvisionalCareer,
} from "../../../src/renderer/create/provisionalCareer.js";
import { SaveId } from "@cm-clone/contracts";

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
  resetProvisionalCareer();
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

  /**
   * Regression: the dialog used to open with focus wherever it happened to be. `useDialogKeyboard`
   * takes the keyboard in a mount effect, and while the hook lived in `QuitGuard` — which stays
   * mounted for the life of the app — that effect ran once at startup with no dialog to focus. The
   * dialog body is its own component now, so the hook's lifetime is the dialog's.
   */
  it("opens focus on Cancel, the safe choice", () => {
    render(<QuitGuard />);
    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
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
/**
 * Quitting mid-creation (group-a-reconciliation ticket 22).
 *
 * The generic dialog is strictly worse than none here: it asks the player to confirm that the app
 * will close, and says nothing about the world that dies with it. These cover both variants, and
 * the provisional one asserts the discard is actually requested rather than merely promised.
 */
describe("QuitGuard mid career creation", () => {
  const show = () => {
    act(() => {
      window.dispatchEvent(new CustomEvent("show-quit-guard"));
    });
  };

  it("names what is lost, instead of asking about closing the app", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    render(<QuitGuard />);
    show();

    expect(screen.getByText(/incomplete career creation will be lost/i)).toBeTruthy();
    expect(screen.queryByText(/close cm-clone/i)).toBeFalsy();
  });

  it("offers continuing and discarding as two actions, not one Quit", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    render(<QuitGuard />);
    show();

    expect(screen.getByRole("button", { name: "Continue Creating" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Discard & Quit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Quit" })).toBeFalsy();
  });

  it("hands the provisional save id to the confirmation, so main can delete it before exiting", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    render(<QuitGuard />);
    show();

    fireEvent.click(screen.getByRole("button", { name: "Discard & Quit" }));

    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith("provisional-1");
  });

  it("continuing cancels the quit and touches nothing", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    render(<QuitGuard />);
    show();

    fireEvent.click(screen.getByRole("button", { name: "Continue Creating" }));

    expect(window.electronAPI.cancelQuit).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.confirmQuit).not.toHaveBeenCalled();
    expect(document.body.querySelector('[role="dialog"]')).toBeFalsy();
  });

  /**
   * A world still being built warns without naming an id: `beginCareer` has not returned one yet.
   * The player must still be told, and the confirmation carries `undefined` rather than inventing
   * a save to delete.
   */
  it("warns while the world is still being built, with no id to discard", () => {
    setProvisionalCareer({ present: true, id: null });
    render(<QuitGuard />);
    show();

    expect(screen.getByText(/incomplete career creation will be lost/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Discard & Quit" }));
    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith(undefined);
  });

  it("a committed career gets the generic dialog, unchanged", () => {
    setProvisionalCareer({ present: false, id: null });
    render(<QuitGuard />);
    show();

    expect(screen.getByText(/close cm-clone/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quit" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Discard & Quit" })).toBeFalsy();

    fireEvent.click(screen.getByRole("button", { name: "Quit" }));
    expect(window.electronAPI.confirmQuit).toHaveBeenCalledWith(undefined);
  });

  it("opens focus on the safe choice in the provisional variant too", () => {
    setProvisionalCareer({ present: true, id: SaveId.make("provisional-1") });
    render(<QuitGuard />);
    show();

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Continue Creating" }));
  });
});
