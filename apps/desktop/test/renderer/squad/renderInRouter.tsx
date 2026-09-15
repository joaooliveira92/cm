import { render } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Render a screen under a one-route memory router. The squad screen reads its list state from the
 *  location (`useListState`), so it cannot mount outside a router. */
export const renderInRouter = (node: ReactNode): void => {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => node }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
};
