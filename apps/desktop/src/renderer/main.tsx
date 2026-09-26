import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router/index.js";
import { HotkeysBoundaryProvider } from "./hotkeys.js";
import { QuitGuard } from "./quitGuard/QuitGuard.js";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HotkeysBoundaryProvider>
      {/* App-level, not route-level: the quit guard answers a question asked
          of the application, so it lives outside the router rather than on any
          route. It stays on top through `MODAL_SCRIM_TOP`, not through DOM
          order, so this position is free to change. */}
      <QuitGuard />
      <RouterProvider router={router} />
    </HotkeysBoundaryProvider>
  </StrictMode>,
);
