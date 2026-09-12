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
      <QuitGuard />
      <RouterProvider router={router} />
    </HotkeysBoundaryProvider>
  </StrictMode>,
);
