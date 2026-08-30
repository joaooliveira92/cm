import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router/index.js";
import { HotkeysBoundaryProvider } from "./hotkeys.js";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HotkeysBoundaryProvider>
      <RouterProvider router={router} />
    </HotkeysBoundaryProvider>
  </StrictMode>,
);
