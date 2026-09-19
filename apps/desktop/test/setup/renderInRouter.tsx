import { render } from "@testing-library/react";
import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";

/** Render a screen under a one-route memory router. Any screen reading its list state from the
 *  location (`useListState` — filters, sort, columns, scroll restoration, §10.1) cannot mount
 *  outside a router: `useLocation` throws `Cannot read properties of null (reading 'isServer')`.
 *
 *  Note that `RouterProvider`'s first synchronous pass renders nothing, so an assertion about the
 *  mount itself has to be `findBy`, not `getBy`. */
export const renderInRouter = (node: ReactNode): void => {
  const router = createRouter({
    routeTree: createRootRoute({ component: () => node }),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(<RouterProvider router={router} />);
};
