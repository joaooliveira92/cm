/**
 * The header's entry point to the command palette.
 *
 * The reference header puts a search field here; this app has no game-data
 * search by construction — the only searchable surface is the Action registry
 * — so the affordance is a palette opener, rendered from the `open-palette`
 * Action record. The label and the key badge come from that record, so this
 * button, the palette, and the help overlay cannot drift apart.
 */
import { SearchIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { ACTION_REGISTRY } from "../../actions/allActions.js";
import { getBindingOverrides, subscribeBindingOverrides } from "../../actions/bindingState.js";
import { dispatchAction } from "../../actions/dispatch.js";
import { effectiveBinding } from "../../actions/overrides.js";
import { ActionKeyBadge } from "../../discoverability/ActionKeyBadge.js";
import { Button } from "../../components/ui/button.js";

export const HeaderSearch = () => {
  const overrides = useSyncExternalStore(
    subscribeBindingOverrides,
    getBindingOverrides,
    getBindingOverrides,
  );
  const action = ACTION_REGISTRY.get("open-palette");
  if (action === undefined) return null;

  const binding = effectiveBinding(action, overrides);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-action-id={action.id}
      className="h-7 gap-2 text-text-secondary"
      aria-label={action.label}
      onClick={() => void dispatchAction(action.id)}
    >
      <SearchIcon aria-hidden="true" className="h-4 w-4" />
      {binding !== undefined && <ActionKeyBadge binding={binding} />}
    </Button>
  );
};
