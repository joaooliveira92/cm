import { describe, expect, it } from "vitest";

/**
 * The regression guard for the renderer/main environment split in
 * `vitest.config.ts`. This file deliberately carries no per-file environment
 * pragma: it gets a DOM purely because it sits under `test/renderer/`. Remove
 * `environment: "jsdom"` from the renderer project and this file fails.
 *
 * Do not name the pragma in this docblock. Vitest scans the file's leading
 * comments for it, so writing it out -- even inside prose explaining its
 * absence -- reinstates it and the guard silently stops guarding.
 */
describe("the renderer project's test environment", () => {
  it("gives a pragma-less file under test/renderer/ a real DOM", () => {
    expect(typeof window).toBe("object");
    expect(typeof document).toBe("object");
    expect(document.defaultView).toBe(window);
  });

  it("gives it a DOM that actually works, not just the globals", () => {
    const host = document.createElement("div");
    host.innerHTML = `<button id="continue" type="button">Continue</button>`;
    document.body.append(host);

    try {
      const button = document.querySelector<HTMLButtonElement>("#continue");
      expect(button).not.toBeNull();
      expect(button?.textContent).toBe("Continue");

      let clicked = 0;
      button?.addEventListener("click", () => {
        clicked += 1;
      });
      button?.click();
      expect(clicked).toBe(1);
    } finally {
      host.remove();
    }
  });
});
