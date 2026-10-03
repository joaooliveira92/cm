import { Outlet, useLocation } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import { CareerChrome } from "../../chrome/CareerChrome.js";
import { RegistryProvider } from "../../rpc.js";
import { ContextTabs } from "../../navigation/components/ContextTabs.js";
import { useCareerSaveScope } from "./hooks/useCareerSaveScope.js";
import { useCareerTabNavigation } from "./hooks/useCareerTabNavigation.js";
import { RouteParamErrorScreen } from "./RouteParamErrorScreen.js";

/**
 * The career parent route (`/career/$saveId`). Owns the persistent shell and
 * the save-scoped Atom registry, relocated whole from `App.tsx`'s career
 * branch — `key={saveId}` keeps a fresh registry per save, so switching saves
 * can never serve stale atoms from a previous career.
 */
export const CareerShell = () => {
  const save = useCareerSaveScope();
  if (save._tag === "Malformed") return <RouteParamErrorScreen reason={save.reason} />;
  const saveId = save.success;
  const handleTabChange = useCareerTabNavigation(saveId);

  // The career shell owns its scroll region: the shell is viewport-fixed and
  // only the outlet scrolls, so the header band and the sidebar are stationary
  // and scrolling can never hide them. A route change starts the new screen at
  // the top of that region (the router's page-level scroll reset no longer
  // applies — the page itself does not scroll).
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pathname = useLocation().pathname;
  useLayoutEffect(() => {
    if (scrollRef.current !== null) scrollRef.current.scrollTop = 0;
  }, [pathname]);

  return (
    <RegistryProvider key={saveId}>
      <CareerChrome saveId={saveId} contextNav={<ContextTabs onChangeTab={handleTabChange} />}>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </CareerChrome>
    </RegistryProvider>
  );
};