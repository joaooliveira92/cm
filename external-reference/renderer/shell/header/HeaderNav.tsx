import { ArrowLeftIcon, ArrowRightIcon, SidebarIcon } from "lucide-react";

import { Button } from "../../components/ui/button.js";
import { ButtonGroup } from "../../components/ui/button-group.js";
import { Separator } from "../../components/ui/separator.js";
import { useSidebar } from "../../components/ui/sidebar.js";
import { NO_DRAG } from "./drag-region.js";

/** A header navigation control. The button is always visible, but may be disabled. */
export interface NavAction {
  readonly disabled: boolean;
  readonly onTrigger: () => void;
}

export interface HeaderNavProps {
  readonly back: NavAction;
  readonly forward: NavAction;
}

export function HeaderNav({ back, forward }: HeaderNavProps) {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="flex items-center gap-2" style={NO_DRAG}>
      <Button
        className="h-8 w-8"
        variant="ghost"
        size="icon"
        aria-label="Toggle sidebar"
        onClick={toggleSidebar}
      >
        <SidebarIcon />
      </Button>
      <Separator orientation="vertical" className="mr-2 h-10" />
      <ButtonGroup>
        <Button
          variant="outline"
          size="icon"
          aria-label="Go back"
          onClick={back.onTrigger}
          disabled={back.disabled}
        >
          <ArrowLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Go forward"
          onClick={forward.onTrigger}
          disabled={forward.disabled}
        >
          <ArrowRightIcon />
        </Button>
      </ButtonGroup>
    </div>
  );
}
