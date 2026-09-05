/**
 * The creation flow's shell: header band, the step's own body through the
 * router `Outlet`, and the one bottom bar. All session state, the world
 * generation lifecycle, and the career commit live in `useCreateSession`.
 */
import { Outlet } from "@tanstack/react-router";
import { Alert } from "../components/ui/alert.js";
import { Header } from "../chrome/header/index.js";
import { ShellBottomBar } from "../chrome/bottom-bar/index.js";
import { CreateSessionContext } from "../router/createSessionContext.js";
import { GenerationStatus } from "./GenerationStatus.js";
import { useCreateSession, type CreationStep } from "./useCreateSession.js";

const STEP_LABELS: Readonly<Record<CreationStep, string>> = {
  leagues: "Step 1 of 4 · League & Nation",
  "1": "Step 2 of 4 · Manager",
  "2": "Step 3 of 4 · Club",
  "3": "Step 4 of 4 · Review",
};

export const CreateFlowLayout = () => {
  const { session, step, bottomBarPlan, retryGeneration, contextValue } = useCreateSession();

  return (
    <CreateSessionContext.Provider value={contextValue}>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        {/* The step lives in the adaptive row, not in the title band: it is
            what the header reports about this shell, the same way the career
            shell's row reports the calendar. */}
        <Header.Shell
          title="New Career"
          state={{
            view: "create",
            step: STEP_LABELS[step],
            hint: "Every step is reversible until the career is created",
          }}
        />

        {/* The leagues and club steps are full-height, full-width bands: each is a workspace of
            columns that scroll independently, which a centred `max-w-5xl` `overflow-y-auto`
            column cannot host — the height has to come from the shell rather than from a viewport
            calc inside the step. Every other step keeps the centred reading column. */}
        <main
          className={
            step === "2" || step === "leagues"
              ? "flex min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-4"
              : "mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto p-8"
          }
        >
          <Outlet />

          {session.error !== null && (
            <Alert
              variant="destructive"
              className="mt-4"
            >
              {session.error}
            </Alert>
          )}

          {step === "1" && session.generation._tag !== "Ready" && (
            <div className="mt-6">
              <GenerationStatus
                state={session.generation}
                onRetry={retryGeneration}
              />
            </div>
          )}
        </main>

        <ShellBottomBar plan={bottomBarPlan} />
      </div>
    </CreateSessionContext.Provider>
  );
};
