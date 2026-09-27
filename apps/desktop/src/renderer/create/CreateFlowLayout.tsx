/**
 * The creation flow's shell: the single-row pre-career band, the step's own
 * body through the router `Outlet`, and the one bottom bar. All session state,
 * the world generation lifecycle, and the career commit live in
 * `useCreateSession`.
 *
 * The band mirrors the career chrome's top row (note: "a lightweight pre-career
 * chrome band, mirroring the career chrome's top row"): it carries the product
 * identity on the left, and an in-band escape cluster plus the "Step N of 4"
 * indicator on the right. Progress is read from the band, not from a detached
 * chip — the floating flow-level `StepBadge` is gone, and the manager form
 * keeps only its own sub-panel stepper.
 *
 * It is the same division the career chrome owns, and the same surface: the
 * band paints the shared `--color-header-*` background, so the main menu, the
 * Save List and this flow share one header background. Only the career shell
 * repaints its band, in club colours. The Save List boot screen is untouched
 * beyond that: it keeps `Header.Shell`'s own band.
 */
import { Outlet } from "@tanstack/react-router";
import { Alert } from "../components/ui/alert.js";
import { Button } from "../components/ui/button.js";
import { Header } from "../chrome/header/index.js";
import { ShellBottomBar } from "../chrome/bottom-bar/index.js";
import type { BottomBarButton, BottomBarPlan } from "../chrome/bottom-bar/index.js";
import { CreateSessionContext } from "../router/createSessionContext.js";
import { DiscardCareerDialog } from "./DiscardCareerDialog.js";
import { GenerationStatus } from "./GenerationStatus.js";
import { useCreateSession, type CreationStep } from "./useCreateSession.js";
import { Backdrop } from "../backdrop/Backdrop.js";
import { MENU_BACKDROP } from "../backdrop/backdrops.js";

const STEP_LABELS: Readonly<Record<CreationStep, string>> = {
  leagues: "Step 1 of 4 · League & Nation",
  "1": "Step 2 of 4 · Manager",
  "2": "Step 3 of 4 · Club",
  "3": "Step 4 of 4 · Review",
};

/** The band's in-band escape cluster — the shell owns leaving and stepping back,
 *  so the controls keep their labels and callbacks wherever the shell places them. */
const BandButton = ({ button }: { readonly button: BottomBarButton }) => (
  <Button
    type="button"
    variant="secondary"
    data-bottom-bar-action={button.id}
    disabled={button.disabled}
    onClick={button.onTrigger}
    className="border border-panel-border-dark/60 bg-black/25 text-text-bright hover:bg-black/35"
  >
    {button.label}
  </Button>
);

export const CreateFlowLayout = () => {
  const {
    session,
    step,
    bottomBarPlan,
    retryGeneration,
    leaveConfirmOpen,
    keepEditing,
    confirmLeave,
    contextValue,
  } = useCreateSession();

  // The forward verb and its supporting actions stay in the bottom bar; Cancel
  // and Back move into the band, where progress is read from.
  const bandPlan: BottomBarPlan = { ...bottomBarPlan, cancel: null, back: null };

  return (
    <CreateSessionContext.Provider value={contextValue}>
      <div className="relative isolate flex h-screen flex-col overflow-hidden text-foreground">
        <Backdrop src={MENU_BACKDROP} />
        <Header.Shell
          title="New Career"
          titleAsHeading={false}
          state={{ view: "create", step: STEP_LABELS[step], hint: "" }}
          identity={
            <h1 className="truncate text-sm font-bold text-text-bright select-none">
              New Career
            </h1>
          }
          actions={
            <div className="flex items-center gap-2">
              {bottomBarPlan.back !== null && <BandButton button={bottomBarPlan.back} />}
              {bottomBarPlan.cancel !== null && <BandButton button={bottomBarPlan.cancel} />}
            </div>
          }
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

        <ShellBottomBar plan={bandPlan} />

        {leaveConfirmOpen && (
          <DiscardCareerDialog
            session={session}
            onKeep={keepEditing}
            onDiscard={confirmLeave}
          />
        )}
      </div>
    </CreateSessionContext.Provider>
  );
};