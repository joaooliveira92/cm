import { useState, type FormEvent } from "react";
import { SAVE_NAME_MAX_LENGTH, type SaveId } from "@cm-clone/contracts";
import { Save } from "lucide-react";
import { Button } from "../components/ui/button.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "../components/ui/dialog.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { FOCUS_RING } from "../focus.js";
import { describeRpcError, saveCareerMutation, useAtomSet, type RpcClientError } from "../rpc.js";
import { useCareerState } from "./CareerStateProvider.js";

/**
 * The player's explicit Save: a header button, left of Continue, that opens a dialog pre-filled
 * with the save's name. A new career's name is the one generated at commit (`suggestedSaveName`), which the player sees
 * here for the first time and may keep, edit, or replace before confirming.
 */
export const SaveGameAction = ({ saveId }: { readonly saveId: SaveId }) => {
  const { saveName } = useCareerState();
  const save = useAtomSet(saveCareerMutation, { mode: "promise" });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const trimmed = draft.trim();
  const valid = trimmed.length > 0 && trimmed.length <= SAVE_NAME_MAX_LENGTH;

  const openDialog = () => {
    setDraft(saveName ?? "");
    setFailure(null);
    setOpen(true);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setFailure(null);
    try {
      await save({ saveId, name: trimmed });
      setOpen(false);
    } catch (error) {
      setFailure(
        error === undefined
          ? "The game could not be saved. Please try again."
          : describeRpcError(error as RpcClientError<"saveCareer">),
      );
    }
    setPending(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-control px-3 py-1 text-body text-header-fg transition-colors hover:bg-header-fg/10 ${FOCUS_RING.join(" ")}`}
      >
        <Save aria-hidden="true" className="size-4" />
        <span>Save</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-md p-4">
          <form onSubmit={(event) => void onSubmit(event)}>
            <DialogTitle className="text-text-primary">Save game</DialogTitle>
            <DialogDescription className="mt-1 text-text-secondary">
              Keep the suggested name or type your own.
            </DialogDescription>
            <Label className="mt-4 block" htmlFor="save-game-name">
              Save name
            </Label>
            <Input
              id="save-game-name"
              type="text"
              className="mt-2"
              value={draft}
              maxLength={SAVE_NAME_MAX_LENGTH}
              onChange={(event) => setDraft(event.currentTarget.value)}
              onFocus={(event) => event.currentTarget.select()}
              autoComplete="off"
              autoFocus
            />
            {failure !== null && (
              <p role="alert" className="mt-2 text-data text-destructive">
                {failure}
              </p>
            )}
            <DialogFooter className="mt-4">
              <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={!valid || pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
