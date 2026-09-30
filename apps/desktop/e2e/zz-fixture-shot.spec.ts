import { continueSeededCareer, expect, goto, test } from "./launchApp.js";
import { savesDir, seedFresh } from "./seedSaves.js";

test("shot", async ({ userDataDir, window }) => {
  await seedFresh(savesDir(userDataDir));
  await continueSeededCareer(window, "Seed: fresh");
  await goto(window, "fixtures");
  await window.getByRole("button", { name: "Next" }).click();
  await expect(window.locator('[data-slot="event-calendar-event"]').first()).toBeVisible();
  await window.screenshot({ path: "/tmp/fixtures-month.png" });
  await window.getByRole("button", { name: /Select view|View/ }).first().click();
  await window.getByRole("menuitem", { name: /Agenda/ }).click();
  await window.screenshot({ path: "/tmp/fixtures-agenda.png" });
});
